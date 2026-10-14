use super::*;
use crate::fake::FakeSeams;
use crate::ids;
use crate::routes::products;

fn configured_seams() -> FakeSeams {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams
}

fn req(claims: &[&str], body: Value, context_extra: Value) -> RouteRequest {
    let mut context = json!({
        "authenticated": true,
        "csrfVerified": true,
        "siteId": "site-a",
        "permissionClaims": claims,
    });
    if let (Value::Object(base), Value::Object(extra)) = (&mut context, context_extra) {
        base.extend(extra);
    }
    RouteRequest {
        route_id: ids::ROUTE_PRODUCT_CREATE.into(),
        method: "POST".into(),
        path: "/products/v1/catalog".into(),
        body: body.to_string(),
        context_json: context.to_string(),
        ..Default::default()
    }
}

fn booking_body() -> Value {
    json!({
        "id": "booking-type-intro-call",
        "slug": "intro-call",
        "title": "Intro call (30 min)",
        "description": "A 30 minute intro consultation.",
        "seoTitle": "Book an intro call",
        "seoDescription": "Schedule a 30 minute Cedros consultation.",
        "productType": "service",
        "inventoryStatus": "in_stock",
        "brand": "Cedros",
        "sku": "INTRO-30",
        "imageUrls": ["https://cdn.example.com/intro.webp"],
        "imageAlt": "Cedros intro consultation",
        "imageWidth": 1200,
        "imageHeight": 630,
        "price": { "amountCents": 5000, "currency": "usd" },
        "categoryIds": ["bookings"],
        "categories": [{"id":"bookings", "slug":"bookings", "name":"Bookings"}],
    })
}

#[test]
fn creates_purchasable_product_and_returns_storefront_shape() {
    let seams = configured_seams();

    let response = handle(
        &seams,
        &req(&[CLAIM_PRODUCT_CREATE], booking_body(), json!({})),
    )
    .unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();

    assert_eq!(response.status, 200);
    assert_eq!(body["contract"], CLAIM_PRODUCT_CREATE);
    assert_eq!(body["contractVersion"], 2);
    assert_eq!(body["created"], true);
    assert_eq!(body["product"]["id"], "booking-type-intro-call");
    assert_eq!(body["product"]["price"]["amountCents"], 5000);
    assert_eq!(body["product"]["price"]["currency"], "USD");
    assert_eq!(body["product"]["seoTitle"], "Book an intro call");
    assert_eq!(body["product"]["schemaEntityKind"], "service");
    assert_eq!(body["product"]["media"][0]["width"], 1200);
    assert_eq!(
        body["product"]["media"][0]["alt"],
        "Cedros intro consultation"
    );
    assert_eq!(body["product"]["purchaseAction"]["urlOwner"], "host");
    assert!(body["product"].get("checkoutUrl").is_none());

    let stored = seams
        .get_entry(ids::MODEL_CATALOG, "booking-type-intro-call")
        .unwrap();
    assert_eq!(stored["active"], true);
    assert_eq!(stored["public"], true);
    assert_eq!(stored["fiatAmountCents"], 5000);
    assert_eq!(stored["productType"], "service");
    assert_eq!(stored["categories"][0]["id"], "bookings");
}

#[test]
fn created_product_is_returned_by_product_read() {
    let seams = configured_seams();
    handle(
        &seams,
        &req(&[CLAIM_PRODUCT_CREATE], booking_body(), json!({})),
    )
    .unwrap();

    let read = RouteRequest {
        route_id: ids::ROUTE_PRODUCT_READ.into(),
        method: "GET".into(),
        path: "/products/v1/catalog".into(),
        context_json: json!({
            "authenticated": true,
            "siteId": "site-a",
            "permissionClaims": ["cedros-pay:product-read"],
        })
        .to_string(),
        ..Default::default()
    };
    let response = products::handle(&seams, &read).unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();

    assert_eq!(body["products"][0]["id"], "booking-type-intro-call");
    assert_eq!(body["categories"][0]["id"], "bookings");
    assert_eq!(body["categories"][0]["title"], "Bookings");
    assert_eq!(body["categories"][0]["productCount"], 1);
    assert_eq!(body["categories"][0]["lifecycle"]["indexEligible"], true);
}

#[test]
fn rejects_unverified_csrf_context_without_writing() {
    let seams = configured_seams();

    let forbidden = handle(
        &seams,
        &req(
            &[CLAIM_PRODUCT_CREATE],
            booking_body(),
            json!({ "csrfVerified": false }),
        ),
    )
    .unwrap_err();

    assert_eq!(forbidden.status, 403);
    assert!(seams
        .get_entry(ids::MODEL_CATALOG, "booking-type-intro-call")
        .is_none());
}

#[test]
fn requires_declared_claim() {
    let seams = configured_seams();
    let forbidden = handle(&seams, &req(&[], booking_body(), json!({}))).unwrap_err();
    assert_eq!(forbidden.status, 403);

    let read_claim_only = handle(
        &seams,
        &req(&["cedros-pay:product-read"], booking_body(), json!({})),
    )
    .unwrap_err();
    assert_eq!(read_claim_only.status, 403);
    assert!(seams
        .get_entry(ids::MODEL_CATALOG, "booking-type-intro-call")
        .is_none());
}

#[test]
fn rejects_invalid_input_without_writing() {
    let seams = configured_seams();
    for body in [
        json!({ "price": { "amountCents": 5000 } }),
        json!({ "title": "x", "price": { "amountCents": 0 } }),
        json!({ "title": "x", "price": { "amountCents": 100 }, "slug": "Bad Slug" }),
        json!({ "title": "x", "price": { "amountCents": 100 }, "productType": "weird" }),
        json!({ "title": "x", "price": { "amountCents": 100 }, "inventoryStatus": "guess" }),
        json!({ "title": "x", "price": { "amountCents": 100 }, "metadata": {"a": 1} }),
        json!({ "title": "x", "price": { "amountCents": 100 }, "imageUrls": ["http://a"] }),
    ] {
        let error = handle(&seams, &req(&[CLAIM_PRODUCT_CREATE], body, json!({}))).unwrap_err();
        assert_eq!(error.status, 400);
    }
}

#[test]
fn duplicate_id_and_slug_conflict_without_overwriting() {
    let seams = configured_seams();
    handle(
        &seams,
        &req(&[CLAIM_PRODUCT_CREATE], booking_body(), json!({})),
    )
    .unwrap();

    let replay = handle(
        &seams,
        &req(&[CLAIM_PRODUCT_CREATE], booking_body(), json!({})),
    )
    .unwrap_err();
    assert_eq!(replay.status, 409);

    let mut slug_clash = booking_body();
    slug_clash["id"] = json!("booking-type-other");
    let error = handle(&seams, &req(&[CLAIM_PRODUCT_CREATE], slug_clash, json!({}))).unwrap_err();
    assert_eq!(error.status, 409);
    assert!(seams
        .get_entry(ids::MODEL_CATALOG, "booking-type-other")
        .is_none());
}

#[test]
fn omitted_id_is_seeded_from_idempotency_key() {
    let seams = configured_seams();
    let mut body = booking_body();
    body.as_object_mut().unwrap().remove("id");

    let response = handle(
        &seams,
        &req(
            &[CLAIM_PRODUCT_CREATE],
            body.clone(),
            json!({ "idempotencyKey": "book_42" }),
        ),
    )
    .unwrap();
    let parsed: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(parsed["product"]["id"], "product-book_42");

    let replay = handle(
        &seams,
        &req(
            &[CLAIM_PRODUCT_CREATE],
            body,
            json!({ "idempotencyKey": "book_42" }),
        ),
    )
    .unwrap_err();
    assert_eq!(replay.status, 409);
}

#[test]
fn active_public_product_requires_explicit_route_identity() {
    let seams = configured_seams();
    let mut body = booking_body();
    body.as_object_mut().unwrap().remove("slug");

    let error = handle(&seams, &req(&[CLAIM_PRODUCT_CREATE], body, json!({}))).unwrap_err();
    assert_eq!(error.status, 400);
}
