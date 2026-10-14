use serde_json::json;

use super::*;

#[test]
fn incomplete_legacy_product_is_explicitly_ineligible() {
    let projected = storefront_product(
        &json!({"id":"legacy", "active":true, "public":true}),
        "site-a",
    )
    .unwrap();

    assert!(projected.get("title").is_none());
    assert_eq!(projected["lifecycle"]["indexEligible"], false);
    assert_eq!(
        projected["lifecycle"]["qualityWarnings"],
        json!(["missingTitle", "missingSlug"])
    );
}

#[test]
fn unsafe_legacy_slug_is_omitted_and_ineligible() {
    let projected = storefront_product(
        &json!({
            "id":"legacy", "active":true, "public":true,
            "title":"Legacy", "slug":"Unsafe Slug"
        }),
        "site-a",
    )
    .unwrap();

    assert!(projected.get("slug").is_none());
    assert_eq!(projected["lifecycle"]["indexEligible"], false);
    assert_eq!(
        projected["lifecycle"]["qualityWarnings"],
        json!(["invalidSlug"])
    );
}

#[test]
fn public_identity_is_site_scoped_and_escaped() {
    let product = json!({
        "id":"authoritative-id", "active":true, "title":"Product", "slug":"product"
    });
    let projected = storefront_product(&product, "site-a").unwrap();

    assert_eq!(
        projected["publicEntityId"],
        "cedros-pay:site:site-a:product:authoritative-id"
    );
    let other_site = storefront_product(&product, "site-b").unwrap();
    assert_ne!(projected["publicEntityId"], other_site["publicEntityId"]);
    let escaped_site = storefront_product(&product, "site:a").unwrap();
    assert_eq!(
        escaped_site["publicEntityId"],
        "cedros-pay:site:site%3Aa:product:authoritative-id"
    );
}

#[test]
fn unsafe_media_is_rejected_and_variant_identity_is_product_scoped() {
    let projected = storefront_product(
        &json!({
            "id":"product-1", "active":true, "title":"Product", "slug":"product",
            "images":[
                {"url":"javascript:alert(1)", "alt":"unsafe"},
                {"url":"https://cdn.example/product.webp", "alt":"safe"}
            ],
            "variants":[{
                "id":"small", "title":"Small",
                "images":[{"url":"data:text/plain,secret"}]
            }]
        }),
        "site-a",
    )
    .unwrap();

    assert_eq!(projected["media"].as_array().unwrap().len(), 1);
    assert_eq!(
        projected["variants"][0]["publicEntityId"],
        "cedros-pay:site:site-a:product:product-1:variant:small"
    );
    assert!(projected["variants"][0].get("imageUrls").is_none());
    assert!(!projected.to_string().contains("javascript:"));
    assert!(!projected.to_string().contains("data:text"));
}

#[test]
fn compare_at_price_must_be_higher_and_use_the_current_currency() {
    let base = json!({
        "id":"product-1", "active":true, "title":"Product", "slug":"product",
        "fiatAmountCents":1000, "fiatCurrency":"USD",
        "compareAtAmountCents":900, "compareAtFiatCurrency":"USD"
    });
    let lower = storefront_product(&base, "site-a").unwrap();
    assert!(lower.get("compareAtPrice").is_none());

    let mut valid_input = base;
    valid_input["compareAtAmountCents"] = json!(1200);
    let valid = storefront_product(&valid_input, "site-a").unwrap();
    assert_eq!(valid["compareAtPrice"]["amountCents"], 1200);

    let mut mismatched_input = valid_input;
    mismatched_input["compareAtFiatCurrency"] = json!("EUR");
    let mismatched = storefront_product(&mismatched_input, "site-a").unwrap();
    assert!(mismatched.get("compareAtPrice").is_none());
}
