use serde::Deserialize;
use serde_json::{json, Map, Value};

use crate::ctx::RequestContext;
use crate::db::EntryRecord;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::stripe::catalog_sync::{self, StripePrice, StripeProduct};

use super::super::catalog_ai::store;
use super::super::support::{admin_product, path_id, read_product_entry};

#[path = "admin_catalog_stripe_prices.rs"]
mod prices;
use prices::{price_fingerprint, price_handles, price_spec, set_price_id, PriceSpec};

#[path = "admin_catalog_stripe_provider.rs"]
mod provider;
use provider::{ensure_price, ensure_product, fetch_stripe};

#[path = "admin_catalog_stripe_job.rs"]
mod job;
pub(crate) use job::run as run_job;

const SYNC_FINGERPRINT: &str = "cedros_stripe_sync_fingerprint";
const PRODUCT_IDENTITY: &str = "cedros_stripe_product_identity";
const SYNC_STATUS: &str = "cedros_stripe_sync_status";
const SYNC_SOURCE: &str = "cedros_stripe_sync_source";
const SYNCED_AT: &str = "cedros_stripe_synced_at";
const SYNC_ERROR: &str = "cedros_stripe_sync_error";

pub(super) fn product<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    if !req.method.eq_ignore_ascii_case("POST") {
        return Err(AppError::not_found("unknown admin route"));
    }
    ctx.require_admin_write()?;
    let id = path_id(&req.path, "/admin/products/", Some("/sync-stripe"))?;
    let entry =
        read_product_entry(seams, &id)?.ok_or_else(|| AppError::not_found("product not found"))?;
    sync_entry(seams, &id, entry)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CatalogSyncRequest {
    product_handle: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CatalogTaxCodeRequest {
    product_handle: String,
    tax_code: String,
}

pub(super) fn set_tax_code<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    if !crate::routes::matches(req, "POST", "/admin/catalog/products/stripe-tax-code") {
        return Err(AppError::not_found("unknown admin route"));
    }
    ctx.require_admin_write_or_capability(&req.route_id)?;
    let input: CatalogTaxCodeRequest = serde_json::from_str(&req.body)
        .map_err(|_| AppError::bad_request("invalid catalog tax code request"))?;
    if !crate::capacity::config::provider_id(&input.tax_code, "txcd_") {
        return Err(AppError::bad_request("invalid Stripe tax code"));
    }
    let entry = store::find_by_handle(seams, &input.product_handle)?
        .ok_or_else(|| AppError::not_found("product not found"))?;
    if entry.payload["recordType"] != "product"
        || entry.payload["productType"] != "capacityAddOn"
        || entry.payload["stableHandle"] != input.product_handle
    {
        return Err(AppError::unprocessable(
            "catalog record is not a capacity add-on",
        ));
    }
    let product_id = entry.payload["stripeProductId"]
        .as_str()
        .filter(|id| crate::capacity::config::provider_id(id, "prod_"))
        .ok_or_else(|| AppError::unprocessable("capacity add-on is not linked to Stripe"))?;
    let tax_code =
        crate::capacity::stripe_get(seams, &format!("/v1/tax_codes/{}", input.tax_code))?;
    if tax_code["object"] != "tax_code"
        || tax_code["id"] != input.tax_code
        || tax_code["name"].as_str().is_none_or(str::is_empty)
    {
        return Err(provider_error(
            "Stripe did not confirm the requested tax code",
        ));
    }
    let product_path = format!("/v1/products/{product_id}");
    let existing = crate::capacity::stripe_get(seams, &product_path)?;
    if existing["object"] != "product"
        || existing["id"] != product_id
        || existing["metadata"]["cedros_catalog_handle"] != input.product_handle
    {
        return Err(AppError::conflict(
            "Stripe product is not linked to this catalog handle",
        ));
    }
    let updated = existing["tax_code"] != input.tax_code;
    if updated {
        let secret = stripe_secret(seams)?;
        let request = crate::stripe::api::stripe_post(
            &secret,
            &product_path,
            &format!(
                "cedros-catalog-tax-code:{}:{}",
                input.product_handle, input.tax_code
            ),
            &[("tax_code".to_string(), input.tax_code.clone())],
        );
        let response = fetch_stripe(seams, &request)?;
        let (status, body) = crate::stripe::api::unwrap_fetch(&response)
            .map_err(|_| provider_error("Stripe tax code update returned an invalid response"))?;
        let value: Value = serde_json::from_str(&body)
            .map_err(|_| provider_error("Stripe tax code update returned invalid JSON"))?;
        if !(200..300).contains(&status)
            || value["object"] != "product"
            || value["id"] != product_id
            || value["tax_code"] != input.tax_code
        {
            return Err(provider_error("Stripe did not accept the product tax code"));
        }
    }
    let verified = crate::capacity::stripe_get(seams, &product_path)?;
    if verified["object"] != "product"
        || verified["id"] != product_id
        || verified["tax_code"] != input.tax_code
        || verified["metadata"]["cedros_catalog_handle"] != input.product_handle
    {
        return Err(provider_error(
            "Stripe product tax code could not be verified",
        ));
    }
    Ok(RouteResponse::ok(&json!({
        "productHandle": input.product_handle,
        "stripeProductId": product_id,
        "taxCode": input.tax_code,
        "taxCodeName": tax_code["name"],
        "updated": updated,
    })))
}

pub(super) fn catalog_product<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    if !crate::routes::matches(req, "POST", "/admin/catalog/products/sync-stripe") {
        return Err(AppError::not_found("unknown admin route"));
    }
    ctx.require_admin_write_or_capability(&req.route_id)?;
    let input: CatalogSyncRequest = serde_json::from_str(&req.body)
        .map_err(|_| AppError::bad_request("invalid catalog Stripe sync request"))?;
    let entry = store::find_by_handle(seams, &input.product_handle)?
        .ok_or_else(|| AppError::not_found("product not found"))?;
    if entry.payload.get("stableHandle").and_then(Value::as_str)
        != Some(input.product_handle.as_str())
        || entry.payload.get("recordType").and_then(Value::as_str) != Some("product")
    {
        return Err(AppError::unprocessable("catalog record is not a product"));
    }
    let id = entry.entry_key.clone();
    sync_entry(seams, &id, entry)
}

fn sync_entry<S: HostSeams>(seams: &S, id: &str, entry: EntryRecord) -> AppResult<RouteResponse> {
    let secret = stripe_secret(seams)?;

    match synchronize(seams, &secret, entry, "manual_sync") {
        Ok(result) => Ok(RouteResponse::ok(&result)),
        Err(error) => {
            record_sync_error(seams, id, "manual_sync")?;
            Err(error)
        }
    }
}

fn synchronize<S: HostSeams>(
    seams: &S,
    secret: &str,
    mut entry: EntryRecord,
    source: &str,
) -> AppResult<Value> {
    let budget = crate::work_budget::WorkBudget::new(seams);
    require_syncable_product(&entry.payload)?;
    let price_handles = price_handles(&entry.payload)?;
    // Persist identity before the provider call so even retries beyond Stripe's
    // idempotency retention recover the same object after a lost response.
    if entry.payload["stripeProductId"].as_str().is_none()
        && entry.payload["metadata"][PRODUCT_IDENTITY]
            .as_str()
            .is_none()
    {
        let mut bytes = [0u8; 16];
        getrandom::fill(&mut bytes)
            .map_err(|_| AppError::internal("secure randomness unavailable"))?;
        let mut payload = entry.payload.clone();
        metadata_mut(&mut payload).insert(
            PRODUCT_IDENTITY.into(),
            json!(format!("prod_cedros_{}", hex::encode(bytes))),
        );
        entry = save(seams, &entry, payload)?;
    }
    let handle = stable_handle(&entry);
    let display_name = display_name(&entry.payload, &handle);
    let description = entry
        .payload
        .get("description")
        .and_then(Value::as_str)
        .unwrap_or_default();

    let (stripe_product, created_product) = ensure_product(
        seams,
        secret,
        &entry.payload,
        &handle,
        &display_name,
        description,
    )?;
    if entry.payload.get("stripeProductId").and_then(Value::as_str)
        != Some(stripe_product.id.as_str())
    {
        let mut payload = entry.payload.clone();
        payload["stripeProductId"] = Value::String(stripe_product.id.clone());
        entry = save(seams, &entry, payload)?;
    }

    let mut created_prices = 0usize;
    let mut replaced_prices = 0usize;
    let mut price_results = Vec::with_capacity(price_handles.len());
    for price_handle in price_handles {
        if budget.exhausted(seams, 90) {
            return Err(AppError::new(
                503,
                "unavailable",
                "Stripe catalog sync will resume on the next run",
            ));
        }
        let spec = price_spec(&entry.payload, &price_handle)?;
        let resuming = entry.payload["metadata"][SYNC_STATUS] == "error";
        let (stripe_price, created, replaced, verified_at) =
            ensure_price(seams, secret, &handle, &stripe_product.id, &spec, resuming)?;
        created_prices += usize::from(created);
        replaced_prices += usize::from(replaced);
        let payload = set_price_id(
            &entry.payload,
            &price_handle,
            &stripe_price.id,
            &stripe_product.id,
            verified_at,
        )?;
        entry = save(seams, &entry, payload)?;
        price_results.push(json!({
            "catalogPriceHandle": price_handle,
            "stripePriceId": stripe_price.id,
            "created": created,
            "replaced": replaced,
        }));
    }

    let mut payload = entry.payload.clone();
    mark_sync_success(&mut payload, seams.now_unix_secs(), source)?;
    entry = save(seams, &entry, payload)?;
    let projected = admin_product(&entry.entry_key, entry.payload.clone());
    Ok(json!({
        "product": projected,
        "stripeProductId": stripe_product.id,
        "createdStripeProduct": created_product,
        "createdStripePrice": created_prices > 0,
        "createdStripePriceCount": created_prices,
        "replacedStripePrice": replaced_prices > 0,
        "replacedStripePriceCount": replaced_prices,
        "prices": price_results,
        "warnings": [],
    }))
}

fn save<S: HostSeams>(seams: &S, entry: &EntryRecord, payload: Value) -> AppResult<EntryRecord> {
    store::save(seams, Some(entry), &entry.entry_key, &payload)
}

fn require_syncable_product(product: &Value) -> AppResult<()> {
    if product.get("status").and_then(Value::as_str) != Some("active")
        || product.get("active").and_then(Value::as_bool) != Some(true)
        || product.get("purchasable").and_then(Value::as_bool) != Some(true)
    {
        return Err(AppError::unprocessable(
            "only active purchasable catalog products can be synchronized to Stripe",
        ));
    }
    Ok(())
}

fn stripe_secret<S: HostSeams>(seams: &S) -> AppResult<String> {
    seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| AppError::new(503, "unavailable", "Stripe is not configured"))
}

fn stable_handle(entry: &EntryRecord) -> String {
    entry
        .payload
        .get("stableHandle")
        .and_then(Value::as_str)
        .unwrap_or(&entry.entry_key)
        .to_string()
}

fn display_name(product: &Value, fallback: &str) -> String {
    ["displayName", "title", "name"]
        .iter()
        .find_map(|key| product.get(*key).and_then(Value::as_str))
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(fallback)
        .to_string()
}

fn mark_sync_success(product: &mut Value, now: i64, source: &str) -> AppResult<()> {
    let fingerprint = sync_fingerprint(product)?;
    let metadata = metadata_mut(product);
    metadata.insert(SYNC_FINGERPRINT.into(), json!(fingerprint));
    metadata.insert(SYNC_STATUS.into(), Value::String("linked".into()));
    metadata.insert(SYNC_SOURCE.into(), Value::String(source.into()));
    metadata.insert(SYNCED_AT.into(), Value::String(crate::time::iso8601(now)));
    metadata.remove(SYNC_ERROR);
    Ok(())
}

fn record_sync_error<S: HostSeams>(seams: &S, id: &str, source: &str) -> AppResult<()> {
    let Some(entry) = crate::db::Db::new(seams, ids::DB_ACCESS).read_one(ids::MODEL_CATALOG, id)?
    else {
        return Ok(());
    };
    let mut payload = entry.payload.clone();
    let metadata = metadata_mut(&mut payload);
    metadata.insert(SYNC_STATUS.into(), Value::String("error".into()));
    metadata.insert(SYNC_SOURCE.into(), Value::String(source.into()));
    metadata.insert(
        SYNCED_AT.into(),
        Value::String(crate::time::iso8601(seams.now_unix_secs())),
    );
    metadata.insert(
        SYNC_ERROR.into(),
        Value::String("Stripe catalog synchronization failed".into()),
    );
    save(seams, &entry, payload)?;
    Ok(())
}

fn metadata_mut(product: &mut Value) -> &mut Map<String, Value> {
    if !product.get("metadata").is_some_and(Value::is_object) {
        product["metadata"] = Value::Object(Map::new());
    }
    product
        .get_mut("metadata")
        .and_then(Value::as_object_mut)
        .expect("metadata object initialized")
}

fn provider_error(internal: &str) -> AppError {
    AppError::new(
        502,
        "provider_unavailable",
        "Could not synchronize the Stripe catalog",
    )
    .with_internal(internal)
}

fn parse_product(raw: &str) -> AppResult<Option<StripeProduct>> {
    catalog_sync::parse_product_fetch(raw).map_err(|error| provider_error(&error))
}

fn parse_price(raw: &str) -> AppResult<Option<StripePrice>> {
    catalog_sync::parse_price_fetch(raw).map_err(|error| provider_error(&error))
}

#[cfg(test)]
#[path = "admin_catalog_stripe_sync_tests.rs"]
mod tests;

fn sync_fingerprint(product: &Value) -> AppResult<String> {
    let prices = price_handles(product)?
        .iter()
        .map(|handle| {
            let price = price_spec(product, handle)?;
            Ok(json!([
                price.handle,
                price.unit_amount_cents,
                price.currency,
                price.interval,
                price.interval_count,
                price.stripe_price_id
            ]))
        })
        .collect::<AppResult<Vec<_>>>()?;
    crate::routes::checkout_claim::fingerprint(&json!({
        "handle": product["stableHandle"], "name": display_name(product, ""),
        "description": product["description"], "stripeProductId": product["stripeProductId"], "prices": prices,
    }))
}

fn needs_sync(product: &Value, now: i64) -> AppResult<bool> {
    let metadata = &product["metadata"];
    let recent = metadata[SYNCED_AT]
        .as_str()
        .and_then(crate::time::parse_iso)
        .is_some_and(|time| now >= time && now - time < 86_400);
    Ok(metadata[SYNC_STATUS] != "linked"
        || !recent
        || metadata[SYNC_FINGERPRINT].as_str() != Some(sync_fingerprint(product)?.as_str()))
}
