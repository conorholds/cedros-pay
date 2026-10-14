//! Translate only buyer intent. Prices, currency, availability, tax and shipping
//! charges are resolved by canonical checkout, never copied from platform JSON.
use crate::{
    db::Db,
    error::{AppError, AppResult},
    seams::HostSeams,
};
use serde_json::{json, Value};

pub(super) fn quote_body<S: HostSeams>(
    seams: &S,
    site: &str,
    origin: &str,
    id: &str,
    revision: u64,
    body: &Value,
) -> AppResult<String> {
    if !body.is_object() {
        return Err(AppError::bad_request("checkout request must be an object"));
    }
    if body.get("cart_id").is_some() {
        return Err(AppError::unprocessable(
            "cart conversion is not advertised by this business",
        ));
    }
    if body.get("payment").is_some_and(|v| !v.is_null()) {
        return Err(AppError::unprocessable(
            "payment credentials must be entered at the secure continue_url",
        ));
    }
    let lines = body["line_items"]
        .as_array()
        .filter(|v| !v.is_empty() && v.len() <= 50)
        .ok_or_else(|| AppError::bad_request("line_items requires 1 to 50 items"))?;
    let mut items = Vec::new();
    let mut requires_shipping = false;
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    for line in lines {
        let id = line["item"]["id"]
            .as_str()
            .ok_or_else(|| AppError::bad_request("line item id is required"))?;
        let (resource, mut variant) = super::catalog::decode_id(site, id)?;
        let qty = line["quantity"]
            .as_u64()
            .filter(|v| *v > 0 && *v <= 999)
            .ok_or_else(|| AppError::bad_request("quantity must be between 1 and 999"))?;
        let product = db
            .read_one(crate::ids::MODEL_CATALOG, &resource)?
            .ok_or_else(|| AppError::not_found("public product was not found"))?;
        if let Some(variants) = product.payload["variants"]
            .as_array()
            .filter(|v| !v.is_empty())
        {
            let selected = match variant.as_deref() {
                Some(id) => variants
                    .iter()
                    .find(|v| v["id"] == id && super::catalog::is_public_variant(v)),
                None => variants
                    .iter()
                    .find(|v| super::catalog::is_public_variant(v)),
            }
            .ok_or_else(|| AppError::unprocessable("public product variant was not found"))?;
            variant = Some(
                selected["id"]
                    .as_str()
                    .ok_or_else(|| AppError::unprocessable("product variant has no identifier"))?
                    .to_string(),
            );
        }
        let facts = crate::routes::products::catalog_item_authority_facts(
            &product.payload,
            &resource,
            variant.as_deref(),
        )?;
        requires_shipping |= facts.shipping_profile_id.is_some()
            || product.payload["fulfillmentType"] == "physical"
            || product.payload["requiresShipping"] == true;
        items.push(json!({"resource":resource,"variantId":variant,"qty":qty}));
    }
    let fulfillment = if let Some(value) = body.get("fulfillment") {
        let methods = value["methods"]
            .as_array()
            .filter(|v| v.len() == 1)
            .ok_or_else(|| {
                AppError::unprocessable("one shipping fulfillment method is required")
            })?;
        let method = &methods[0];
        if method["type"] != "shipping" {
            return Err(AppError::unprocessable(
                "only shipping fulfillment is supported",
            ));
        }
        let destinations = method["destinations"]
            .as_array()
            .ok_or_else(|| AppError::unprocessable("shipping destination is required"))?;
        let selected = method["selected_destination_id"].as_str();
        let destination = if destinations.len() == 1 && selected.is_none() {
            Some(&destinations[0])
        } else {
            destinations
                .iter()
                .find(|v| v["id"].as_str() == selected && selected.is_some())
        }
        .ok_or_else(|| AppError::unprocessable("select a shipping destination"))?;
        let groups = method["groups"]
            .as_array()
            .filter(|v| v.len() == 1)
            .ok_or_else(|| AppError::unprocessable("select one shipping option"))?;
        let option = groups[0]["selected_option_id"]
            .as_str()
            .ok_or_else(|| AppError::unprocessable("select a shipping option"))?;
        json!({"kind":"shipping","address":{"line1":destination["street_address"],"line2":destination.get("extended_address"),"city":destination["address_locality"],"region":destination.get("address_region"),"postalCode":destination["postal_code"],"country":destination["address_country"]},"shipping":{"optionId":option}})
    } else {
        if requires_shipping {
            return Err(AppError::unprocessable(
                "shipping items require a destination and selected shipping option",
            ));
        }
        json!({"kind":"digital"})
    };
    let mut context =
        json!({"fulfillment":fulfillment,"returnUrls":{"success":origin,"cancel":origin}});
    if let Some(buyer) = body.get("buyer") {
        let mut contact = serde_json::Map::new();
        for (source, target) in [("email", "email"), ("phone_number", "phone")] {
            if let Some(value) = buyer.get(source) {
                contact.insert(target.into(), value.clone());
            }
        }
        let name = [buyer["first_name"].as_str(), buyer["last_name"].as_str()]
            .into_iter()
            .flatten()
            .collect::<Vec<_>>()
            .join(" ");
        if !name.is_empty() {
            contact.insert("displayName".into(), json!(name));
        }
        if !contact.is_empty() {
            context["contact"] = Value::Object(contact);
        }
    }
    let key = super::session_store::digest(&format!("{id}-{revision}-quote"));
    let attempt = format!("{id}-{revision}");
    let material = json!({"items":items,"customerContext":context}).to_string();
    let quote = json!({"schemaVersion":1,"idempotencyKey":key,"attemptId":attempt,"clientMaterialSha256":super::session_store::digest(&material),"source":{"kind":"items","items":items},"customerContext":context,"requestedPaymentMethods":["stripe"]});
    Ok(quote.to_string())
}
