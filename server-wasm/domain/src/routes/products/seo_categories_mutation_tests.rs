use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::RouteRequest;

fn seams() -> FakeSeams {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams
}

fn product(categories: Value) -> Value {
    let authored = categories
        .as_array()
        .into_iter()
        .flatten()
        .map(|value| {
            value.as_str().map_or_else(
                || value.clone(),
                |id| {
                    let name = id
                        .split('-')
                        .map(|part| {
                            let mut chars = part.chars();
                            chars
                                .next()
                                .map(|first| {
                                    first.to_uppercase().collect::<String>() + chars.as_str()
                                })
                                .unwrap_or_default()
                        })
                        .collect::<Vec<_>>()
                        .join(" ");
                    json!({"id":id, "slug":id, "name":name})
                },
            )
        })
        .collect::<Vec<_>>();
    json!({
        "id": "product-1", "title": "Product", "active": true, "public": true,
        "categories": authored,
        "customerEmail": "must-not-publish@example.invalid",
        "secret": "must-not-publish",
    })
}

fn slug_product(id: &str, slug: &str) -> Value {
    let mut value = product(json!([]));
    value["id"] = json!(id);
    value["slug"] = json!(slug);
    value
}

#[test]
fn catalog_and_slug_fence_commit_atomically_with_exact_wire_shape() {
    let seams = seams();
    let record = product(json!(["books", "audio-books"]));
    super::create(&seams, "product-1", &record).unwrap();

    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "product-1"),
        Some(record)
    );
    let request = seams.last_db_batch_request().unwrap();
    assert_eq!(request["schemaVersion"], 1);
    assert_eq!(request["conditions"].as_array().unwrap().len(), 2);
    assert_eq!(request["ops"].as_array().unwrap().len(), 2);
    assert_eq!(request["ops"][0]["op"], "write");
    assert_eq!(
        request["ops"][1]["contentModelId"],
        ids::MODEL_CATALOG_FENCE
    );
    assert_eq!(request["ops"][1]["entryKey"], "seo-snapshot:fence");
    assert_eq!(seams.entry_count(ids::MODEL_WEBHOOK_OUTBOX), 0);
}

#[test]
fn changed_and_deleted_catalog_records_preserve_atomic_fence() {
    let seams = seams();
    super::create(&seams, "product-1", &product(json!(["books"]))).unwrap();
    super::update(&seams, "product-1", &product(json!(["music"]))).unwrap();
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap()["categories"][0]["id"],
        "music"
    );
    assert!(super::delete(&seams, "product-1").unwrap());
    assert!(seams.get_entry(ids::MODEL_CATALOG, "product-1").is_none());
    assert!(!super::delete(&seams, "product-1").unwrap());
}

#[test]
fn slug_update_same_id_and_delete_reuse_follow_one_linearizable_invariant() {
    let seams = seams();
    super::create(&seams, "one", &slug_product("one", "shared")).unwrap();
    super::update(&seams, "one", &slug_product("one", "shared")).unwrap();

    let error = super::create(&seams, "two", &slug_product("two", "shared")).unwrap_err();
    assert_eq!((error.status, error.code), (409, "conflict"));
    super::create(&seams, "two", &slug_product("two", "other")).unwrap();
    let error = super::update(&seams, "two", &slug_product("two", "shared")).unwrap_err();
    assert_eq!((error.status, error.code), (409, "conflict"));
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "two").unwrap()["slug"],
        "other"
    );

    assert!(super::delete(&seams, "one").unwrap());
    super::update(&seams, "two", &slug_product("two", "shared")).unwrap();
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "two").unwrap()["slug"],
        "shared"
    );
}

#[test]
fn concurrent_same_slug_loser_reloads_fence_and_rejects() {
    let seams = seams();
    super::create(&seams, "base", &slug_product("base", "base")).unwrap();
    seams.queue_guarded_race(vec![
        (
            ids::MODEL_CATALOG,
            "winner",
            slug_product("winner", "contested"),
        ),
        (
            ids::MODEL_CATALOG_FENCE,
            "seo-snapshot:fence",
            json!({
                "recordType":"seoSnapshotFence", "updatedAt": "1970-01-01T00:00:01Z"
            }),
        ),
    ]);

    let error = super::create(&seams, "loser", &slug_product("loser", "contested")).unwrap_err();
    assert_eq!((error.status, error.code), (409, "conflict"));
    assert!(seams.get_entry(ids::MODEL_CATALOG, "winner").is_some());
    assert!(seams.get_entry(ids::MODEL_CATALOG, "loser").is_none());
}

#[test]
fn fence_conflict_retry_rebuilds_catalog_and_commits_distinct_slug() {
    let seams = seams();
    super::create(&seams, "base", &slug_product("base", "base")).unwrap();
    seams.queue_guarded_race(vec![
        (
            ids::MODEL_CATALOG,
            "winner",
            slug_product("winner", "winner"),
        ),
        (
            ids::MODEL_CATALOG_FENCE,
            "seo-snapshot:fence",
            json!({
                "recordType":"seoSnapshotFence", "updatedAt": "1970-01-01T00:00:01Z"
            }),
        ),
    ]);

    super::create(&seams, "retry", &slug_product("retry", "distinct")).unwrap();
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "winner").unwrap()["slug"],
        "winner"
    );
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "retry").unwrap()["slug"],
        "distinct"
    );
}

#[test]
fn admin_create_update_and_delete_routes_preserve_catalog_invariants() {
    let seams = seams();
    let admin = |route_id: &str, method: &str, path: &str, body: Value| RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        body: body.to_string(),
        context_json: json!({
            "authenticated":true,"systemAdmin":true,"csrfVerified":true,
            "permissionClaims":["*"]
        })
        .to_string(),
        ..Default::default()
    };
    let create = admin(
        ids::ROUTE_ADMIN_PRODUCTS_CREATE,
        "POST",
        "/admin/products",
        {
            let mut value = product(json!(["books"]));
            value["slug"] = json!("shared");
            value["previousSlugs"] = json!(["attacker-controlled"]);
            value
        },
    );
    assert_eq!(crate::router::handle_route(&seams, create).status, 200);
    assert!(seams
        .get_entry(ids::MODEL_CATALOG, "product-1")
        .unwrap()
        .get("previousSlugs")
        .is_none());

    let second = admin(
        ids::ROUTE_ADMIN_PRODUCTS_CREATE,
        "POST",
        "/admin/products",
        slug_product("product-2", "other"),
    );
    assert_eq!(crate::router::handle_route(&seams, second).status, 200);
    let collision = admin(
        ids::ROUTE_ADMIN_PRODUCTS_UPDATE,
        "PUT",
        "/admin/products/product-2",
        slug_product("product-2", "shared"),
    );
    assert_eq!(crate::router::handle_route(&seams, collision).status, 409);
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "product-2").unwrap()["slug"],
        "other"
    );

    let update = admin(
        ids::ROUTE_ADMIN_PRODUCTS_UPDATE,
        "PUT",
        "/admin/products/product-1",
        product(json!(["music"])),
    );
    assert_eq!(crate::router::handle_route(&seams, update).status, 200);
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap()["categories"][0]["id"],
        "music"
    );

    let delete = admin(
        ids::ROUTE_ADMIN_PRODUCTS_DELETE,
        "DELETE",
        "/admin/products/product-1",
        Value::Null,
    );
    assert_eq!(crate::router::handle_route(&seams, delete).status, 200);
    assert!(seams.get_entry(ids::MODEL_CATALOG, "product-1").is_none());
}
