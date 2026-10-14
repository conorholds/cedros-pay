//! Stripe Product and recurring Price synchronization over the allowlisted
//! `http.fetch` seam. Catalog stable handles are attached as Stripe metadata;
//! provider IDs are persisted by the route layer after each successful create.

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use super::api::{stripe_get, stripe_post, unwrap_fetch};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StripeProduct {
    pub id: String,
    pub active: bool,
    pub catalog_handle: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StripePrice {
    pub id: String,
    pub active: bool,
    pub product_id: String,
    pub unit_amount_cents: i64,
    pub currency: String,
    pub interval: Option<String>,
    pub interval_count: Option<i64>,
    pub tax_behavior: Option<String>,
}

pub fn build_create_product_fetch(
    secret_key: &str,
    product_id: &str,
    stable_handle: &str,
    display_name: &str,
    description: &str,
) -> Value {
    let mut params = product_params(stable_handle, display_name, description);
    params.push(("id".into(), product_id.into()));
    stripe_post(
        secret_key,
        "/v1/products",
        &format!(
            "cedros-catalog-product-create:{product_id}:{}",
            fingerprint(&params)
        ),
        &params,
    )
}

pub fn build_update_product_fetch(
    secret_key: &str,
    stripe_product_id: &str,
    stable_handle: &str,
    display_name: &str,
    description: &str,
) -> Value {
    let params = product_params(stable_handle, display_name, description);
    let fingerprint = fingerprint(&params);
    stripe_post(
        secret_key,
        &format!("/v1/products/{stripe_product_id}"),
        &format!("cedros-catalog-product-update:{stripe_product_id}:{fingerprint}"),
        &params,
    )
}

pub fn build_retrieve_product_fetch(secret_key: &str, stripe_product_id: &str) -> Value {
    stripe_get(secret_key, &format!("/v1/products/{stripe_product_id}"))
}

pub struct CreatePriceRequest<'a> {
    pub product_handle: &'a str,
    pub price_handle: &'a str,
    pub stripe_product_id: &'a str,
    pub unit_amount_cents: i64,
    pub currency: &'a str,
    pub interval: Option<&'a str>,
    pub interval_count: Option<i64>,
    pub tax_behavior: Option<&'a str>,
}

pub fn build_create_price_fetch(secret_key: &str, request: &CreatePriceRequest<'_>) -> Value {
    let mut params = vec![
        ("product".to_string(), request.stripe_product_id.to_string()),
        (
            "unit_amount".to_string(),
            request.unit_amount_cents.to_string(),
        ),
        (
            "currency".to_string(),
            request.currency.to_ascii_lowercase(),
        ),
        (
            "metadata[cedros_catalog_product_handle]".to_string(),
            request.product_handle.to_string(),
        ),
        (
            "metadata[cedros_catalog_price_handle]".to_string(),
            request.price_handle.to_string(),
        ),
        ("nickname".to_string(), request.price_handle.to_string()),
    ];
    if let Some(interval) = request.interval {
        params.push(("recurring[interval]".to_string(), interval.to_string()));
        params.push((
            "recurring[interval_count]".to_string(),
            request.interval_count.unwrap_or(1).to_string(),
        ));
    }
    if let Some(tax) = request.tax_behavior {
        params.push(("tax_behavior".into(), tax.into()));
    }
    let lookup_key = price_lookup_key(request);
    params.push(("lookup_key".into(), lookup_key.clone()));
    stripe_post(
        secret_key,
        "/v1/prices",
        &format!("cedros-catalog-price-create-v2:{lookup_key}"),
        &params,
    )
}

pub fn build_retrieve_price_fetch(secret_key: &str, stripe_price_id: &str) -> Value {
    stripe_get(secret_key, &format!("/v1/prices/{stripe_price_id}"))
}

pub fn parse_product_fetch(raw: &str) -> Result<Option<StripeProduct>, String> {
    let (status, body) = unwrap_fetch(raw)?;
    if status == 404 {
        return Ok(None);
    }
    let value = provider_value(status, &body)?;
    let id = provider_id(&value, "prod_")?;
    Ok(Some(StripeProduct {
        id,
        active: value
            .get("active")
            .and_then(Value::as_bool)
            .unwrap_or(false),
        catalog_handle: value["metadata"]["cedros_catalog_handle"]
            .as_str()
            .map(str::to_string),
    }))
}

pub fn parse_price_fetch(raw: &str) -> Result<Option<StripePrice>, String> {
    let (status, body) = unwrap_fetch(raw)?;
    if status == 404 {
        return Ok(None);
    }
    let value = provider_value(status, &body)?;
    let id = provider_id(&value, "price_")?;
    let product_id = value
        .get("product")
        .and_then(|value| {
            value
                .as_str()
                .or_else(|| value.get("id").and_then(Value::as_str))
        })
        .filter(|value| value.starts_with("prod_"))
        .ok_or_else(|| "Stripe price response is missing its product ID".to_string())?
        .to_string();
    let recurring = value.get("recurring").filter(|value| !value.is_null());
    Ok(Some(StripePrice {
        id,
        active: value
            .get("active")
            .and_then(Value::as_bool)
            .unwrap_or(false),
        product_id,
        unit_amount_cents: value
            .get("unit_amount")
            .and_then(Value::as_i64)
            .ok_or_else(|| "Stripe price response is missing unit_amount".to_string())?,
        currency: value
            .get("currency")
            .and_then(Value::as_str)
            .ok_or_else(|| "Stripe price response is missing currency".to_string())?
            .to_ascii_uppercase(),
        interval: recurring
            .and_then(|value| value.get("interval"))
            .and_then(Value::as_str)
            .map(str::to_string),
        tax_behavior: value["tax_behavior"].as_str().map(str::to_string),
        interval_count: recurring
            .and_then(|value| value.get("interval_count"))
            .and_then(Value::as_i64),
    }))
}

pub fn product_response(id: &str, active: bool) -> String {
    json!({"id": id, "object": "product", "active": active}).to_string()
}

fn product_params(
    stable_handle: &str,
    display_name: &str,
    description: &str,
) -> Vec<(String, String)> {
    vec![
        ("name".to_string(), display_name.to_string()),
        ("description".to_string(), description.to_string()),
        ("active".to_string(), "true".to_string()),
        (
            "metadata[cedros_catalog_handle]".to_string(),
            stable_handle.to_string(),
        ),
        ("metadata[cedros_managed]".to_string(), "true".to_string()),
    ]
}

fn provider_value(status: u16, body: &str) -> Result<Value, String> {
    let value: Value = serde_json::from_str(body)
        .map_err(|_| "Stripe returned a non-JSON response".to_string())?;
    if !(200..300).contains(&status) {
        let message = value
            .pointer("/error/message")
            .and_then(Value::as_str)
            .unwrap_or("Stripe rejected the catalog request");
        return Err(format!("Stripe returned HTTP {status}: {message}"));
    }
    Ok(value)
}

fn provider_id(value: &Value, prefix: &str) -> Result<String, String> {
    value
        .get("id")
        .and_then(Value::as_str)
        .filter(|id| id.starts_with(prefix))
        .map(str::to_string)
        .ok_or_else(|| format!("Stripe response is missing a valid {prefix} ID"))
}

fn fingerprint(params: &[(String, String)]) -> String {
    let mut digest = Sha256::new();
    for (key, value) in params {
        digest.update(key.as_bytes());
        digest.update([0]);
        digest.update(value.as_bytes());
        digest.update([0xff]);
    }
    hex::encode(&digest.finalize()[..8])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recurring_price_request_is_keyed_and_metadata_bound() {
        let request = build_create_price_fetch(
            "sk_test_secret",
            &CreatePriceRequest {
                product_handle: "cedros-individual",
                price_handle: "cedros-individual-annual",
                stripe_product_id: "prod_123",
                unit_amount_cents: 22_800,
                currency: "USD",
                interval: Some("year"),
                interval_count: Some(1),
                tax_behavior: None,
            },
        );
        let body = request["body"].as_str().unwrap();
        assert!(body.contains("product=prod_123"));
        assert!(body.contains("unit_amount=22800"));
        assert!(body.contains("recurring%5Binterval%5D=year"));
        assert!(body.contains("cedros-individual-annual"));
        let headers = request["headers"].as_array().unwrap();
        assert!(headers.iter().any(|header| {
            header[0] == "idempotency-key"
                && header[1].as_str().is_some_and(|value| {
                    value.starts_with("cedros-catalog-price-create-v2:cedros_")
                        && value.len() <= 255
                })
        }));
        assert!(
            !request.to_string().contains("sk_test_secret")
                || request["headers"].to_string().contains("sk_test_secret")
        );
    }

    #[test]
    fn durable_lookup_identity_is_bound_to_product_and_price_terms() {
        let mut request = CreatePriceRequest {
            product_handle: "plan",
            price_handle: "monthly",
            stripe_product_id: "prod_one",
            unit_amount_cents: 100,
            currency: "USD",
            interval: Some("month"),
            interval_count: Some(1),
            tax_behavior: None,
        };
        let key = price_lookup_key(&request);
        assert_eq!(key, price_lookup_key(&request));
        assert!(build_create_price_fetch("secret", &request)["body"]
            .as_str()
            .unwrap()
            .contains(&format!("lookup_key={key}")));
        request.stripe_product_id = "prod_two";
        assert_ne!(key, price_lookup_key(&request));
        request.stripe_product_id = "prod_one";
        request.unit_amount_cents = 200;
        assert_ne!(key, price_lookup_key(&request));
        request.unit_amount_cents = 100;
        request.tax_behavior = Some("exclusive");
        assert_ne!(key, price_lookup_key(&request));
        assert!(build_create_price_fetch("secret", &request)["body"]
            .as_str()
            .unwrap()
            .contains("tax_behavior=exclusive"));
    }

    #[test]
    fn provider_lookup_rejects_malformed_or_ambiguous_results() {
        for body in [
            json!({}),
            json!({"data":[],"has_more":true}),
            json!({"data":[{},{}],"has_more":false}),
        ] {
            assert!(parse_lookup_price_fetch(
                &json!({"status":200,"body":body.to_string()}).to_string()
            )
            .is_err());
        }
    }

    #[test]
    fn product_creation_uses_durable_id_and_updates_clear_description() {
        let create = build_create_product_fetch("secret", "prod_unique", "plan", "Plan", "");
        assert!(create["body"].as_str().unwrap().contains("id=prod_unique"));
        let update = build_update_product_fetch("secret", "prod_unique", "plan", "Plan", "");
        assert!(update["body"].as_str().unwrap().contains("description="));
    }

    #[test]
    fn parses_recurring_price_and_missing_provider_record() {
        let raw = json!({
            "status": 200,
            "body": json!({
                "id":"price_123", "active":true, "product":"prod_123",
                "unit_amount":2900, "currency":"usd",
                "recurring":{"interval":"month","interval_count":1}
            }).to_string()
        })
        .to_string();
        let price = parse_price_fetch(&raw).unwrap().unwrap();
        assert_eq!(price.interval.as_deref(), Some("month"));
        assert_eq!(price.currency, "USD");

        let missing = json!({"status":404,"body":"{\"error\":{}}"}).to_string();
        assert_eq!(parse_price_fetch(&missing).unwrap(), None);
    }
}

fn price_lookup_key(request: &CreatePriceRequest<'_>) -> String {
    let mut identity = json!([
        request.stripe_product_id,
        request.price_handle,
        request.unit_amount_cents,
        request.currency.to_ascii_lowercase(),
        request.interval,
        request.interval_count.unwrap_or(1)
    ]);
    if let (Some(tax), Value::Array(values)) = (request.tax_behavior, &mut identity) {
        values.push(json!(tax));
    }
    format!(
        "cedros_{}",
        hex::encode(Sha256::digest(identity.to_string().as_bytes()))
    )
}

pub fn build_lookup_price_fetch(secret: &str, request: &CreatePriceRequest<'_>) -> Value {
    stripe_get(
        secret,
        &format!(
            "/v1/prices?lookup_keys%5B%5D={}&limit=2",
            price_lookup_key(request)
        ),
    )
}

pub fn parse_lookup_price_fetch(raw: &str) -> Result<Option<StripePrice>, String> {
    let (status, body) = unwrap_fetch(raw)?;
    let value = provider_value(status, &body)?;
    let rows = value["data"]
        .as_array()
        .ok_or("Stripe price lookup omitted data")?;
    if rows.len() > 1 || value["has_more"] != false {
        return Err("Stripe price lookup was ambiguous".into());
    }
    rows.first()
        .map(|price| {
            parse_price_fetch(&json!({"status":200,"body":price.to_string()}).to_string())
                .and_then(|price| price.ok_or_else(|| "Stripe price lookup omitted price".into()))
        })
        .transpose()
}
