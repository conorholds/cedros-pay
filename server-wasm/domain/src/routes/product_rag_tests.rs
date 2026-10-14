use super::*;
use crate::fake::FakeSeams;

fn req(claims: &[&str]) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_PRODUCT_RAG_RECORDS.into(),
        method: "GET".into(),
        path: "/products/v1/rag-records".into(),
        context_json: json!({
            "authenticated": true,
            "siteId": "site-a",
            "permissionClaims": claims,
        })
        .to_string(),
        ..Default::default()
    }
}

#[test]
fn catalog_price_cents_reads_every_price_shape() {
    assert_eq!(
        catalog_price_cents(&json!({ "price": { "amountCents": 1299 } })),
        Some(1299)
    );
    assert_eq!(
        catalog_price_cents(&json!({ "fiatAmountCents": 500 })),
        Some(500)
    );
    assert_eq!(
        catalog_price_cents(&json!({ "fiatPrice": { "amountCents": 999 } })),
        Some(999)
    );
    assert_eq!(catalog_price_cents(&json!({ "title": "free?" })), None);
    assert_eq!(catalog_price_cents(&json!({ "fiatAmountCents": 0 })), None);
    assert_eq!(catalog_currency(&json!({ "fiatCurrency": "EUR" })), "EUR");
    assert_eq!(catalog_currency(&json!({ "title": "x" })), "USD");
}

#[test]
fn product_rag_records_are_public_safe_and_site_scoped() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({
            "id": "prod_1", "active": true, "title": "Public product",
            "slug": "public-product", "description": "Safe public description",
            "fiatAmountCents": 1299, "fiatCurrency": "USD",
            "compareAtAmountCents": 1599, "compareAtFiatCurrency": "USD",
            "metadata": { "buyerEmail": "buyer@example.com" },
            "tags": ["commerce"],
            "images": [{ "url": "https://cdn.example/product.png" }]
        }),
    );
    seams.seed(
        ids::MODEL_CATALOG,
        "draft_1",
        json!({ "id": "draft_1", "active": true, "status": "draft", "title": "Draft" }),
    );

    let response = handle(&seams, &req(&[CLAIM_PRODUCT_RAG])).unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();
    let record = &body["records"][0];

    assert_eq!(response.status, 200);
    assert_eq!(body["source"], "products");
    assert_eq!(body["contractVersion"], 2);
    assert_eq!(body["records"].as_array().unwrap().len(), 1);
    assert_eq!(record["siteId"], "site-a");
    assert_eq!(record["sourceId"], "product-live:cedros-pay:site-a:prod_1");
    assert_eq!(record["price"]["amountCents"], 1299);
    assert_eq!(record["compareAtPrice"]["amountCents"], 1599);
    assert!(record.get("salePrice").is_none());
    assert!(record.get("metadata").is_none());
    assert!(!record.to_string().contains("buyer@example.com"));
}

#[test]
fn product_rag_requires_declared_claim() {
    let seams = FakeSeams::new();
    let error = handle(&seams, &req(&[])).unwrap_err();
    assert_eq!(error.status, 403);
}

#[test]
fn product_rag_omits_records_without_authored_titles_and_unsafe_media() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_CATALOG,
        "missing-title",
        json!({"id":"payload-id", "active":true, "slug":"missing-title"}),
    );
    seams.seed(
        ids::MODEL_CATALOG,
        "safe-product",
        json!({
            "id":"spoofed-id", "active":true, "title":"Safe", "slug":"safe",
            "imageUrls":["javascript:alert(1)", "https://cdn.example/safe.webp"]
        }),
    );

    let response = handle(&seams, &req(&[CLAIM_PRODUCT_RAG])).unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();

    assert_eq!(body["records"].as_array().unwrap().len(), 1);
    assert_eq!(body["records"][0]["productId"], "safe-product");
    assert_eq!(
        body["records"][0]["imageUrls"],
        json!(["https://cdn.example/safe.webp"])
    );
    assert!(!body.to_string().contains("javascript:"));
}
