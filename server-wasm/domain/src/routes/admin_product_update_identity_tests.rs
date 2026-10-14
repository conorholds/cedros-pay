use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};

fn request(method: &str, path: &str, body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_ADMIN_PRODUCTS_UPDATE.into(),
        method: method.into(),
        path: path.into(),
        body: body.to_string(),
        context_json: json!({
            "authenticated": true,
            "systemAdmin": true,
            "csrfVerified": true,
            "permissionClaims": ["*"]
        })
        .to_string(),
        ..Default::default()
    }
}

fn product(id: Option<&str>) -> Value {
    match id {
        Some(id) => json!({"id": id, "title": "Updated", "categoryIds": ["music"]}),
        None => json!({"title": "Updated", "categoryIds": ["music"]}),
    }
}

fn call(seams: &FakeSeams, request: RouteRequest) -> RouteResponse {
    crate::router::handle_route(seams, request)
}

fn assert_rejected_without_effects(method: &str, path: &str, body: Value) {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams.seed(
        ids::MODEL_CATALOG,
        "product-1",
        json!({"id":"product-1","title":"Original","categoryIds":["books"]}),
    );
    let before = seams.get_entry(ids::MODEL_CATALOG, "product-1");
    let before_batch = seams.last_db_batch_request();

    let response = call(&seams, request(method, path, body));

    assert!(matches!(response.status, 400 | 404), "{}", response.body);
    assert_eq!(seams.get_entry(ids::MODEL_CATALOG, "product-1"), before);
    assert_eq!(seams.last_db_batch_request(), before_batch);
}

#[test]
fn mismatched_missing_and_blank_body_ids_have_zero_effects() {
    assert_rejected_without_effects(
        "PUT",
        "/admin/products/product-1",
        product(Some("other-product")),
    );
    assert_rejected_without_effects("PUT", "/admin/products/product-1", product(None));
    assert_rejected_without_effects("PUT", "/admin/products/product-1", product(Some("")));
}

#[test]
fn method_encoded_path_and_unicode_lookalike_ids_have_zero_effects() {
    assert_rejected_without_effects(
        "POST",
        "/admin/products/product-1",
        product(Some("product-1")),
    );
    assert_rejected_without_effects(
        "PUT",
        "/admin/products/product%2D1",
        product(Some("product-1")),
    );
    assert_rejected_without_effects(
        "PUT",
        "/admin/products/pr\u{043e}duct-1",
        product(Some("product-1")),
    );
}

#[test]
fn exact_path_and_body_id_updates_catalog_and_categories() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams.seed(
        ids::MODEL_CATALOG,
        "product-1",
        json!({
            "id":"product-1", "title":"Original", "slug":"original",
            "categories":[{"id":"books","slug":"books","name":"Books"}],
            "createdAt":"2024-01-01T00:00:00Z"
        }),
    );

    let response = call(
        &seams,
        request(
            "PUT",
            "/admin/products/product-1",
            json!({
                "id":"product-1", "title":"Updated", "slug":"updated",
                "categories":[{"id":"music","slug":"music","name":"Music"}]
            }),
        ),
    );

    assert_eq!(response.status, 200, "{}", response.body);
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap()["title"],
        "Updated"
    );
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap()["previousSlugs"],
        json!(["original"])
    );
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap()["createdAt"],
        "2024-01-01T00:00:00Z"
    );
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap()["categories"][0]["id"],
        "music"
    );
}

#[test]
fn slug_history_keeps_the_twenty_most_recent_safe_identities() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    let history = (0..25)
        .map(|index| format!("prior-{index:02}"))
        .collect::<Vec<_>>();
    seams.seed(
        ids::MODEL_CATALOG,
        "product-1",
        json!({
            "id":"product-1", "title":"Original", "slug":"current-old",
            "previousSlugs":history, "categoryIds":["books"]
        }),
    );

    let response = call(
        &seams,
        request(
            "PUT",
            "/admin/products/product-1",
            json!({
                "id":"product-1", "title":"Updated", "slug":"current-new",
                "categoryIds":["books"]
            }),
        ),
    );

    assert_eq!(response.status, 200, "{}", response.body);
    let stored = seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap();
    let previous = stored["previousSlugs"].as_array().unwrap();
    assert_eq!(previous.len(), 20);
    assert_eq!(previous.first().unwrap(), "prior-06");
    assert_eq!(previous.last().unwrap(), "current-old");
}

#[test]
fn request_body_cannot_inject_redirect_history() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams.seed(
        ids::MODEL_CATALOG,
        "product-1",
        json!({"id":"product-1", "title":"Product", "slug":"current"}),
    );

    let response = call(
        &seams,
        request(
            "PUT",
            "/admin/products/product-1",
            json!({
                "id":"product-1", "title":"Product", "slug":"current",
                "previousSlugs":["attacker-controlled"]
            }),
        ),
    );

    assert_eq!(response.status, 200, "{}", response.body);
    let stored = seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap();
    assert!(stored.get("previousSlugs").is_none());
}
