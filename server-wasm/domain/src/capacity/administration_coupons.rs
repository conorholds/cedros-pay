//! Customer/product-scoped, forever Stripe promotion codes for recurring add-ons.
use super::{billing, fields, identifier, Config};
use crate::{
    db::{Db, Filter, Op, Query},
    error::{AppError, AppResult},
    ids,
    seams::HostSeams,
};
use serde_json::{json, Value};

pub(super) fn ensure<S: HostSeams>(s: &S, body: &Value) -> AppResult<Value> {
    fields(body, &["organizationId", "code", "percentOff"])?;
    let c = Config::load(s)?;
    let org = identifier(body, "organizationId")?;
    let customer = &c
        .organizations
        .get(org)
        .ok_or_else(|| AppError::not_found("organization billing binding not found"))?
        .stripe_customer_id;
    let code = body["code"]
        .as_str()
        .filter(|v| !v.is_empty() && v.len() <= 64 && v.bytes().all(|b| b.is_ascii_alphanumeric()))
        .ok_or_else(|| AppError::bad_request("code must contain 1-64 letters or numbers"))?;
    let percent = body["percentOff"]
        .as_u64()
        .filter(|n| *n > 0 && *n <= 100)
        .ok_or_else(|| AppError::bad_request("percentOff must be an integer from 1 to 100"))?;
    let rows = Db::new(s, ids::DB_ACCESS).read(
        ids::MODEL_CATALOG,
        &Query::new()
            .filter(Filter::new("stableHandle", Op::Eq, "cedros-addon-sites"))
            .limit(2),
    )?;
    if rows.len() != 1 {
        return Err(AppError::conflict(
            "site add-on catalog product is not unique",
        ));
    }
    let product = rows[0].payload["stripeProductId"]
        .as_str()
        .filter(|v| crate::capacity::config::provider_id(v, "prod_"))
        .ok_or_else(|| AppError::conflict("site add-on has not been synchronized with Stripe"))?;
    let found = billing::get(
        s,
        &format!("/v1/promotion_codes?code={code}&active=true&limit=2&expand%5B%5D=data.coupon.applies_to"),
    )?;
    let codes = found["data"]
        .as_array()
        .ok_or_else(crate::capacity::wire::unavailable)?;
    if found["has_more"] != false || codes.len() > 1 {
        return Err(AppError::conflict("promotion code is ambiguous"));
    }
    if let Some(p) = codes.first() {
        verify(p, code, customer, product, percent, &c)?;
        return Ok(projection(p, false));
    }
    let digest = setup_digest(&c, org, customer, product, percent, code)?;
    let coupon_id = format!("capacity_{}", digest.trim_start_matches("sha256:"));
    let coupon = match billing::get_optional(
        s,
        &format!("/v1/coupons/{coupon_id}?expand%5B%5D=applies_to"),
    )? {
        Some(coupon) => coupon,
        None => billing::post(
            s,
            "/v1/coupons",
            &format!("capacity-coupon:{digest}"),
            &[
                ("id".into(), coupon_id.clone()),
                ("percent_off".into(), percent.to_string()),
                ("duration".into(), "forever".into()),
                ("expand[]".into(), "applies_to".into()),
                ("applies_to[products][0]".into(), product.into()),
                ("metadata[capacityOrganizationId]".into(), org.into()),
            ],
        )?,
    };
    verify_coupon(&coupon, product, percent, &c)?;
    if coupon["id"] != coupon_id {
        return Err(AppError::conflict("Stripe returned a different coupon"));
    }
    let p = billing::post(
        s,
        "/v1/promotion_codes",
        &format!("capacity-promotion:{digest}"),
        &[
            ("coupon".into(), coupon_id),
            ("expand[]".into(), "coupon.applies_to".into()),
            ("code".into(), code.into()),
            ("customer".into(), customer.into()),
            ("metadata[capacityOrganizationId]".into(), org.into()),
        ],
    )?;
    let mut p = p;
    if p["coupon"].is_string() {
        if p["coupon"] != coupon["id"] {
            return Err(AppError::conflict(
                "Stripe returned a different coupon binding",
            ));
        }
        p["coupon"] = coupon;
    }
    verify(&p, code, customer, product, percent, &c)?;
    Ok(projection(&p, true))
}
fn verify_coupon(coupon: &Value, product: &str, percent: u64, c: &Config) -> AppResult<()> {
    if coupon["valid"] != true
        || coupon["livemode"] != (c.environment == "live")
        || coupon["percent_off"].as_f64() != Some(percent as f64)
        || coupon["duration"] != "forever"
        || coupon["applies_to"]["products"] != json!([product])
    {
        return Err(AppError::conflict(
            "coupon does not match the requested recurring site discount",
        ));
    }
    Ok(())
}
fn verify(
    p: &Value,
    code: &str,
    customer: &str,
    product: &str,
    percent: u64,
    c: &Config,
) -> AppResult<()> {
    verify_coupon(&p["coupon"], product, percent, c)?;
    if p["active"] != true
        || p["livemode"] != (c.environment == "live")
        || p["customer"] != customer
        || !p["code"]
            .as_str()
            .is_some_and(|v| v.eq_ignore_ascii_case(code))
        || !p["expires_at"].is_null()
        || !p["max_redemptions"].is_null()
        || p["restrictions"]["first_time_transaction"] != false
        || !p["restrictions"]["minimum_amount"].is_null()
        || !p["id"]
            .as_str()
            .is_some_and(|v| crate::capacity::config::provider_id(v, "promo_"))
    {
        return Err(AppError::conflict(
            "existing promotion code has different customer, product, or renewal restrictions",
        ));
    }
    Ok(())
}
fn projection(p: &Value, created: bool) -> Value {
    json!({"created":created,"promotionCodeId":p["id"],"code":p["code"],"couponId":p["coupon"]["id"],"percentOff":p["coupon"]["percent_off"],"duration":"forever","customerId":p["customer"],"productIds":p["coupon"]["applies_to"]["products"]})
}

/// Redacted provider inspection keeps operator repair decisions inside MCP.
pub(super) fn inspect<S: HostSeams>(s: &S, body: &Value) -> AppResult<Value> {
    let c = Config::load(s)?;
    let org = identifier(body, "organizationId")?;
    let customer = &c
        .organizations
        .get(org)
        .ok_or_else(|| AppError::not_found("organization billing binding not found"))?
        .stripe_customer_id;
    let code = body["couponCode"]
        .as_str()
        .filter(|v| !v.is_empty() && v.len() <= 64 && v.bytes().all(|b| b.is_ascii_alphanumeric()))
        .ok_or_else(|| AppError::bad_request("couponCode must contain 1-64 letters or numbers"))?;
    let percent = match body.get("couponPercentOff") {
        None => 100,
        Some(v) => v
            .as_u64()
            .filter(|v| (1..=100).contains(v))
            .ok_or_else(|| {
                AppError::bad_request("couponPercentOff must be an integer from 1 to 100")
            })?,
    };
    let rows = Db::new(s, ids::DB_ACCESS).read(
        ids::MODEL_CATALOG,
        &Query::new()
            .filter(Filter::new("stableHandle", Op::Eq, "cedros-addon-sites"))
            .limit(2),
    )?;
    if rows.len() != 1 {
        return Err(AppError::conflict(
            "site add-on catalog product is not unique",
        ));
    }
    let product = rows[0].payload["stripeProductId"]
        .as_str()
        .filter(|v| crate::capacity::config::provider_id(v, "prod_"))
        .ok_or_else(|| AppError::conflict("site add-on has not been synchronized with Stripe"))?;
    let found = billing::get(
        s,
        &format!("/v1/promotion_codes?code={code}&active=true&limit=100&expand%5B%5D=data.coupon.applies_to"),
    )?;
    let codes = found["data"]
        .as_array()
        .ok_or_else(crate::capacity::wire::unavailable)?;
    let has_more = found["has_more"]
        .as_bool()
        .ok_or_else(crate::capacity::wire::unavailable)?;
    let candidates: Vec<_> = codes.iter().map(|p| {
        let coupon = &p["coupon"];
        let products = &coupon["applies_to"]["products"];
        json!({"promotionCodeId":p["id"],"code":p["code"],"active":p["active"],
            "environmentMatches":p["livemode"] == (c.environment == "live"),
            "customerRestricted":!p["customer"].is_null(),
            "customerMatches":p["customer"].is_null() || p["customer"] == *customer,
            "couponId":coupon["id"],"valid":coupon["valid"],"duration":coupon["duration"],
            "percentOff":coupon["percent_off"],"amountOff":coupon["amount_off"],"currency":coupon["currency"],
            "productRestricted":!products.is_null(),
            "productScopeKnown":coupon.get("applies_to").is_some(),
            "productMatches":coupon.get("applies_to").is_some() && (products.is_null() || products.as_array().is_some_and(|v| v.iter().any(|v| v == product))),
            "expiresAt":p["expires_at"],"maxRedemptions":p["max_redemptions"],
            "firstTimeOnly":p["restrictions"]["first_time_transaction"],
            "minimumAmount":p["restrictions"]["minimum_amount"]})
    }).collect();
    let digest = setup_digest(&c, org, customer, product, percent, code)?;
    let coupon_id = format!("capacity_{}", digest.trim_start_matches("sha256:"));
    let setup_coupon = billing::get_optional(
        s,
        &format!("/v1/coupons/{coupon_id}?expand%5B%5D=applies_to"),
    )?
    .map(|coupon| {
        json!({"couponId":coupon["id"],"valid":coupon["valid"],
            "environmentMatches":coupon["livemode"] == (c.environment == "live"),
            "percentOff":coupon["percent_off"],"duration":coupon["duration"],
            "productIds":coupon["applies_to"]["products"],
            "termsMatch":verify_coupon(&coupon,product,percent,&c).is_ok()})
    });
    Ok(json!({"complete":!has_more,"candidates":candidates,"setupCoupon":setup_coupon}))
}

fn setup_digest(
    c: &Config,
    org: &str,
    customer: &str,
    product: &str,
    percent: u64,
    code: &str,
) -> AppResult<String> {
    crate::capacity::wire::digest(&json!([
        c.pay_installation_id,
        c.environment,
        org,
        customer,
        product,
        percent,
        code.to_ascii_lowercase()
    ]))
}
