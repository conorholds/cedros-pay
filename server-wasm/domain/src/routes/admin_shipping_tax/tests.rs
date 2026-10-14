use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;

fn admin_ctx() -> String {
    json!({
        "authenticated": true,
        "permissionClaims": [ids::ROUTE_ADMIN],
        "csrfVerified": true
    })
    .to_string()
}

fn request(method: &str, path: &str, route_id: &str, body: Value) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        body: body.to_string(),
        context_json: admin_ctx(),
        ..Default::default()
    }
}

#[test]
fn creates_and_lists_shipping_profile() {
    let seams = FakeSeams::new();
    let create = request(
        "POST",
        "/admin/shipping/profiles",
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_CREATE,
        json!({
            "id": "domestic",
            "name": " Domestic ",
            "countries": ["us", "CA", "us"],
            "active": true
        }),
    );

    let created: Value = serde_json::from_str(&handle(&seams, &create).unwrap().body).unwrap();

    assert_eq!(created["id"], "domestic");
    assert_eq!(created["name"], "Domestic");
    assert_eq!(created["countries"], json!(["CA", "US"]));
    assert!(created.get("kind").is_none());

    let list = request(
        "GET",
        "/admin/shipping/profiles",
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_LIST,
        Value::Null,
    );
    let listed: Value = serde_json::from_str(&handle(&seams, &list).unwrap().body).unwrap();
    assert_eq!(listed["profiles"].as_array().unwrap().len(), 1);
}

#[test]
fn create_shipping_rate_requires_existing_profile() {
    let seams = FakeSeams::new();
    let create = request(
        "POST",
        "/admin/shipping/profiles/missing/rates",
        ids::ROUTE_ADMIN_SHIPPING_RATES_CREATE,
        json!({
            "id": "ground",
            "name": "Ground",
            "rateType": "flat",
            "amountCents": 599,
            "currency": "usd"
        }),
    );

    let error = handle(&seams, &create).unwrap_err();

    assert_eq!(error.status, 404);
}

#[test]
fn deleting_shipping_profile_removes_rates() {
    let seams = FakeSeams::new();
    handle(
        &seams,
        &request(
            "POST",
            "/admin/shipping/profiles",
            ids::ROUTE_ADMIN_SHIPPING_PROFILES_CREATE,
            json!({ "id": "domestic", "name": "Domestic", "countries": ["US"] }),
        ),
    )
    .unwrap();
    handle(
        &seams,
        &request(
            "POST",
            "/admin/shipping/profiles/domestic/rates",
            ids::ROUTE_ADMIN_SHIPPING_RATES_CREATE,
            json!({
                "id": "ground",
                "name": "Ground",
                "rateType": "flat",
                "amountCents": 599,
                "currency": "USD"
            }),
        ),
    )
    .unwrap();

    let response = handle(
        &seams,
        &request(
            "DELETE",
            "/admin/shipping/profiles/domestic",
            ids::ROUTE_ADMIN_SHIPPING_PROFILES_DELETE,
            Value::Null,
        ),
    )
    .unwrap();

    assert_eq!(response.status, 200);
    assert_eq!(seams.entry_count(ids::MODEL_CATALOG), 0);
}

#[test]
fn creates_tax_rate_with_normalized_region() {
    let seams = FakeSeams::new();
    let create = request(
        "POST",
        "/admin/taxes",
        ids::ROUTE_ADMIN_TAX_RATES_CREATE,
        json!({
            "id": "ca",
            "name": " California ",
            "country": "us",
            "region": "ca",
            "rateBps": 725
        }),
    );

    let created: Value = serde_json::from_str(&handle(&seams, &create).unwrap().body).unwrap();

    assert_eq!(created["name"], "California");
    assert_eq!(created["country"], "US");
    assert_eq!(created["region"], "CA");
    assert_eq!(created["rateBps"], 725);
}

#[test]
fn rejects_invalid_tax_rate_bps() {
    let seams = FakeSeams::new();
    let create = request(
        "POST",
        "/admin/taxes",
        ids::ROUTE_ADMIN_TAX_RATES_CREATE,
        json!({
            "id": "bad",
            "name": "Bad",
            "country": "US",
            "rateBps": 10001
        }),
    );

    let error = handle(&seams, &create).unwrap_err();

    assert_eq!(error.status, 400);
}
