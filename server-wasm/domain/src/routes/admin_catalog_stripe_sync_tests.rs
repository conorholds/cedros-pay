use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

fn request(route_id: &str, method: &str, path: &str, body: Value) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        body: body.to_string(),
        context_json: json!({
            "authenticated": true,
            "systemAdmin": true,
            "csrfVerified": true,
            "permissionClaims": [ids::ROUTE_ADMIN]
        })
        .to_string(),
        ..Default::default()
    }
}

fn call(seams: &FakeSeams, request: RouteRequest) -> RouteResponse {
    crate::router::handle_route(seams, request)
}

fn body(response: &RouteResponse) -> Value {
    serde_json::from_str(&response.body).expect("JSON response")
}

fn seed_subscription_product(seams: &FakeSeams) {
    crate::guarded_policy::enroll(seams).expect("guarded policy fixture");
    let draft = call(
        seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            "PUT",
            "/admin/catalog/products/upsert",
            json!({"product": {
                "stableHandle":"cedros-individual", "displayName":"Individual",
                "description":"For one primary operator.", "status":"draft",
                "public":false, "purchasable":false, "productType":"subscription",
                "metadata":{"accountModel":"individual"}
            }}),
        ),
    );
    assert_eq!(draft.status, 200, "{}", draft.body);
    for (handle, amount, interval) in [
        ("cedros-individual-annual", 22_800, "year"),
        ("cedros-individual-monthly", 2_900, "month"),
    ] {
        let price = call(
            seams,
            request(
                ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT,
                "PUT",
                "/admin/catalog/prices/upsert",
                json!({
                    "productHandle":"cedros-individual",
                    "price": {
                        "stableHandle":handle, "unitAmountCents":amount, "currency":"USD",
                        "billingInterval":interval, "billingIntervalCount":1,
                        "status":"active", "public":true, "purchasable":true, "trialDays":3
                    }
                }),
            ),
        );
        assert_eq!(price.status, 200, "{}", price.body);
    }
    let active = call(
        seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            "PUT",
            "/admin/catalog/products/upsert",
            json!({"product": {
                "stableHandle":"cedros-individual", "displayName":"Individual",
                "description":"For one primary operator.", "status":"active",
                "public":true, "purchasable":true, "productType":"subscription",
                "metadata":{"accountModel":"individual"}
            }}),
        ),
    );
    assert_eq!(active.status, 200, "{}", active.body);
    let entry = super::store::find_by_handle(seams, "cedros-individual")
        .unwrap()
        .unwrap();
    let mut payload = entry.payload.clone();
    payload["metadata"][super::PRODUCT_IDENTITY] = json!("prod_individual");
    super::save(seams, &entry, payload).unwrap();
}

fn sync_request() -> RouteRequest {
    request(
        ids::ROUTE_ADMIN_PRODUCTS_STRIPE_SYNC,
        "POST",
        "/admin/products/cedros-individual/sync-stripe",
        Value::Null,
    )
}

fn capability_sync_request(handle: &str) -> RouteRequest {
    let mut req = request(
        ids::ROUTE_ADMIN_CATALOG_STRIPE_SYNC,
        "POST",
        "/extensions/cedros-pay/admin/catalog/products/sync-stripe",
        json!({"productHandle": handle}),
    );
    req.context_json = json!({
        "authenticated": true,
        "authScheme": "bearer-token",
        "capabilityClaims": [ids::ROUTE_ADMIN_CATALOG_STRIPE_SYNC]
    })
    .to_string();
    req
}

fn stripe_price(id: &str, amount: i64, interval: &str) -> String {
    json!({
        "id":id, "object":"price", "active":true, "product":"prod_individual",
        "unit_amount":amount, "currency":"usd",
        "recurring":{"interval":interval,"interval_count":1}
    })
    .to_string()
}

fn tax_code_request(handle: &str, code: &str) -> RouteRequest {
    let mut req = request(
        ids::ROUTE_ADMIN_CATALOG_STRIPE_TAX_CODE_SET,
        "POST",
        "/extensions/cedros-pay/admin/catalog/products/stripe-tax-code",
        json!({"productHandle":handle,"taxCode":code}),
    );
    req.context_json = json!({
        "authenticated": true,
        "authScheme": "bearer-token",
        "capabilityClaims": [ids::ROUTE_ADMIN_CATALOG_STRIPE_TAX_CODE_SET]
    })
    .to_string();
    req
}

fn seed_linked_add_on(seams: &FakeSeams) {
    crate::guarded_policy::enroll(seams).expect("guarded policy fixture");
    seams.seed(
        ids::MODEL_CATALOG,
        "legacy-sites-key",
        json!({
            "recordType":"product",
            "stableHandle":"cedros-addon-sites",
            "productType":"capacityAddOn",
            "status":"draft",
            "stripeProductId":"prod_sites"
        }),
    );
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
}

fn stripe_tax_product(handle: &str, code: Value) -> String {
    json!({
        "id":"prod_sites",
        "object":"product",
        "metadata":{"cedros_catalog_handle":handle},
        "tax_code":code
    })
    .to_string()
}

#[test]
fn capability_sets_and_verifies_tax_code_on_linked_draft_add_on() {
    let seams = FakeSeams::new();
    seed_linked_add_on(&seams);
    seams.push_http_response(
        200,
        &json!({
            "id":"txcd_10701100","object":"tax_code","name":"Website Hosting"
        })
        .to_string(),
    );
    seams.push_http_response(200, &stripe_tax_product("cedros-addon-sites", Value::Null));
    seams.push_http_response(
        200,
        &stripe_tax_product("cedros-addon-sites", json!("txcd_10701100")),
    );
    seams.push_http_response(
        200,
        &stripe_tax_product("cedros-addon-sites", json!("txcd_10701100")),
    );

    let response = call(
        &seams,
        tax_code_request("cedros-addon-sites", "txcd_10701100"),
    );
    assert_eq!(response.status, 200, "{}", response.body);
    assert_eq!(body(&response)["taxCode"], "txcd_10701100");
    assert_eq!(body(&response)["updated"], true);
    assert_eq!(seams.http_requests.borrow().len(), 4);
}

#[test]
fn capability_rejects_a_stripe_product_for_another_catalog_handle() {
    let seams = FakeSeams::new();
    seed_linked_add_on(&seams);
    seams.push_http_response(
        200,
        &json!({
            "id":"txcd_10701100","object":"tax_code","name":"Website Hosting"
        })
        .to_string(),
    );
    seams.push_http_response(200, &stripe_tax_product("unrelated-handle", Value::Null));

    let response = call(
        &seams,
        tax_code_request("cedros-addon-sites", "txcd_10701100"),
    );
    assert_eq!(response.status, 409, "{}", response.body);
    assert_eq!(seams.http_requests.borrow().len(), 2);
}

#[test]
fn capability_rejects_unverified_tax_code_before_product_update() {
    let seams = FakeSeams::new();
    seed_linked_add_on(&seams);
    seams.push_http_response(
        200,
        &json!({
            "id":"txcd_other","object":"tax_code","name":"Different code"
        })
        .to_string(),
    );

    let response = call(
        &seams,
        tax_code_request("cedros-addon-sites", "txcd_10701100"),
    );
    assert_ne!(response.status, 200, "{}", response.body);
    assert_eq!(seams.http_requests.borrow().len(), 1);
}

#[test]
fn capability_syncs_the_exact_catalog_product_without_admin_cookie() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    seams.push_http_response(404, r#"{"error":{}}"#);
    seams.push_http_response(
        200,
        &crate::stripe::catalog_sync::product_response("prod_individual", true),
    );
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_response(200, &stripe_price("price_annual", 22_800, "year"));
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_response(200, &stripe_price("price_monthly", 2_900, "month"));

    let response = call(&seams, capability_sync_request("cedros-individual"));
    assert_eq!(response.status, 200, "{}", response.body);
    assert_eq!(body(&response)["createdStripePriceCount"], 2);
    assert_eq!(seams.http_requests.borrow().len(), 6);
}

#[test]
fn capability_sync_resolves_stable_handle_when_catalog_key_differs() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams.seed(
        ids::MODEL_CATALOG,
        "legacy-email-key",
        json!({
            "recordType":"product", "stableHandle":"cedros-addon-email-recipients-v2",
            "displayName":"Email Sends", "description":"10,000 accepted recipients",
            "metadata":{"cedros_stripe_product_identity":"prod_individual"},
            "productType":"capacityAddOn", "status":"active", "active":true,
            "public":false, "purchasable":true,
            "prices":[{
                "stableHandle":"email-recipients-10000-monthly", "status":"active",
                "public":false, "purchasable":true, "unitAmountCents":500,
                "currency":"USD", "billingInterval":"month", "billingIntervalCount":1
            }]
        }),
    );
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    seams.push_http_response(404, r#"{"error":{}}"#);
    seams.push_http_response(
        200,
        &crate::stripe::catalog_sync::product_response("prod_individual", true),
    );
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    let mut provider_price: Value =
        serde_json::from_str(&stripe_price("price_email", 500, "month")).unwrap();
    provider_price["tax_behavior"] = json!("exclusive");
    seams.push_http_response(200, &provider_price.to_string());

    let response = call(
        &seams,
        capability_sync_request("cedros-addon-email-recipients-v2"),
    );
    assert_eq!(response.status, 200, "{}", response.body);
    assert_eq!(body(&response)["createdStripePriceCount"], 1);
    assert_eq!(seams.http_requests.borrow().len(), 4);
    assert!(seams.http_requests.borrow().last().unwrap()["body"]
        .as_str()
        .unwrap()
        .contains("tax_behavior=exclusive"));
}

#[test]
fn capability_rejects_wrong_claim_and_unknown_product_without_stripe_calls() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");

    let mut wrong_claim = capability_sync_request("cedros-individual");
    wrong_claim.context_json = json!({
        "authenticated": true,
        "authScheme": "bearer-token",
        "capabilityClaims": [ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT]
    })
    .to_string();
    assert_eq!(call(&seams, wrong_claim).status, 403);
    assert_eq!(
        call(&seams, capability_sync_request("missing-product")).status,
        404
    );
    assert!(seams.http_requests.borrow().is_empty());
}

#[test]
fn creates_stripe_product_and_both_recurring_prices_then_persists_ids() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    seams.push_http_response(404, r#"{"error":{}}"#);
    seams.push_http_response(
        200,
        &crate::stripe::catalog_sync::product_response("prod_individual", true),
    );
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_response(200, &stripe_price("price_annual", 22_800, "year"));
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_response(200, &stripe_price("price_monthly", 2_900, "month"));

    let response = call(&seams, sync_request());
    assert_eq!(response.status, 200, "{}", response.body);
    let value = body(&response);
    assert_eq!(value["createdStripeProduct"], true);
    assert_eq!(value["createdStripePriceCount"], 2);
    assert_eq!(value["warnings"], json!([]));

    let requests = seams.http_requests.borrow();
    assert_eq!(requests.len(), 6);
    assert_eq!(requests[1]["url"], "https://api.stripe.com/v1/products");
    assert!(requests[3]["body"]
        .as_str()
        .unwrap()
        .contains("recurring%5Binterval%5D=year"));
    assert!(requests[5]["body"]
        .as_str()
        .unwrap()
        .contains("recurring%5Binterval%5D=month"));
    assert!(requests.iter().all(|request| {
        !request
            .get("body")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .contains("sk_test_private")
    }));
    drop(requests);

    let query = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_RECORDS_QUERY,
            "POST",
            "/admin/catalog/records/query",
            json!({"stableHandle":"cedros-individual"}),
        ),
    );
    let record = &body(&query)["records"][0];
    assert_eq!(record["stripeProductId"], "prod_individual");
    assert_eq!(record["metadata"]["cedros_stripe_sync_status"], "linked");
    assert_eq!(record["prices"][0]["stripePriceId"], "price_annual");
    assert_eq!(record["prices"][1]["stripePriceId"], "price_monthly");

    let product_upsert = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            "PUT",
            "/admin/catalog/products/upsert",
            json!({"product": {
                "stableHandle":"cedros-individual", "displayName":"Individual",
                "description":"For one primary operator.", "status":"active",
                "public":true, "purchasable":true, "productType":"subscription",
                "metadata":{"accountModel":"individual"}
            }}),
        ),
    );
    assert_eq!(product_upsert.status, 200, "{}", product_upsert.body);
    let price_upsert = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT,
            "PUT",
            "/admin/catalog/prices/upsert",
            json!({
                "productHandle":"cedros-individual",
                "price": {
                    "stableHandle":"cedros-individual-monthly", "unitAmountCents":2900,
                    "currency":"USD", "billingInterval":"month", "billingIntervalCount":1,
                    "status":"active", "public":true, "purchasable":true, "trialDays":3
                }
            }),
        ),
    );
    assert_eq!(price_upsert.status, 200, "{}", price_upsert.body);
    let query = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_RECORDS_QUERY,
            "POST",
            "/admin/catalog/records/query",
            json!({"stableHandle":"cedros-individual"}),
        ),
    );
    let record = &body(&query)["records"][0];
    assert_eq!(record["stripeProductId"], "prod_individual");
    assert_eq!(record["metadata"]["cedros_stripe_sync_status"], "linked");
    assert_eq!(record["prices"][0]["stripePriceId"], "price_annual");
    assert_eq!(record["prices"][1]["stripePriceId"], "price_monthly");
}

#[test]
fn rerun_reuses_matching_provider_records_without_creating_duplicates() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    seams.push_http_response(404, r#"{"error":{}}"#);
    seams.push_http_response(
        200,
        &crate::stripe::catalog_sync::product_response("prod_individual", true),
    );
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_response(200, &stripe_price("price_annual", 22_800, "year"));
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_response(200, &stripe_price("price_monthly", 2_900, "month"));
    assert_eq!(call(&seams, sync_request()).status, 200);

    seams.push_http_response(
        200,
        &crate::stripe::catalog_sync::product_response("prod_individual", true),
    );
    seams.push_http_response(
        200,
        &crate::stripe::catalog_sync::product_response("prod_individual", true),
    );
    seams.push_http_response(200, &stripe_price("price_annual", 22_800, "year"));
    seams.push_http_response(200, &stripe_price("price_monthly", 2_900, "month"));
    let response = call(&seams, sync_request());
    assert_eq!(response.status, 200, "{}", response.body);
    let value = body(&response);
    assert_eq!(value["createdStripeProduct"], false);
    assert_eq!(value["createdStripePriceCount"], 0);
    assert_eq!(value["replacedStripePriceCount"], 0);

    let rerun = &seams.http_requests.borrow()[6..];
    assert_eq!(rerun.len(), 4);
    assert_eq!(rerun[0]["method"], "GET");
    assert_eq!(rerun[1]["method"], "POST");
    assert_eq!(rerun[2]["method"], "GET");
    assert_eq!(rerun[3]["method"], "GET");
}

#[test]
fn missing_credentials_and_provider_errors_fail_closed() {
    let missing = FakeSeams::new();
    seed_subscription_product(&missing);
    let response = call(&missing, sync_request());
    assert_eq!(response.status, 503);
    assert_eq!(missing.http_requests.borrow().len(), 0);

    let rejected = FakeSeams::new();
    seed_subscription_product(&rejected);
    rejected.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    rejected.push_http_response(401, r#"{"error":{"message":"Invalid API Key provided"}}"#);
    let response = call(&rejected, sync_request());
    assert_eq!(response.status, 502);
    assert!(!response.body.contains("sk_test_private"));
    assert!(!response.body.contains("Invalid API Key"));
}

fn queue_initial_sync(seams: &FakeSeams) {
    seams.push_http_response(404, r#"{"error":{}}"#);
    seams.push_http_response(
        200,
        &crate::stripe::catalog_sync::product_response("prod_individual", true),
    );
    for (id, amount, interval) in [
        ("price_annual", 22_800, "year"),
        ("price_monthly", 2_900, "month"),
    ] {
        seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
        seams.push_http_response(200, &stripe_price(id, amount, interval));
    }
}

fn catalog_job(seams: &FakeSeams) -> crate::reqresp::JobOutcome {
    crate::router::run_job(
        seams,
        crate::reqresp::JobExecution {
            job_id: ids::JOB_CATALOG_SYNC.into(),
            ..Default::default()
        },
    )
}

#[test]
fn automatic_sync_publishes_then_skips_unchanged_catalog() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    seams.set_setting("stripe.enabled", "true");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    queue_initial_sync(&seams);
    let result = catalog_job(&seams);
    assert_eq!(
        result.status,
        crate::reqresp::JobStatus::Succeeded,
        "{}",
        result.details_json
    );
    assert_eq!(
        serde_json::from_str::<Value>(&result.details_json).unwrap()["syncedCount"],
        1
    );
    let entry = super::store::find_by_handle(&seams, "cedros-individual")
        .unwrap()
        .unwrap();
    assert_eq!(
        entry.payload["metadata"][super::SYNC_SOURCE],
        "automatic_sync"
    );
    assert_eq!(
        catalog_job(&seams).status,
        crate::reqresp::JobStatus::Succeeded
    );
    assert_eq!(seams.http_requests.borrow().len(), 6);
    let mut edited = entry.payload.clone();
    edited["displayName"] = json!("Updated plan");
    assert!(super::needs_sync(&edited, seams.now_unix_secs()).unwrap());
    edited = entry.payload.clone();
    edited["prices"][0]["unitAmountCents"] = json!(30_000);
    assert!(super::needs_sync(&edited, seams.now_unix_secs()).unwrap());
    assert!(super::needs_sync(&entry.payload, seams.now_unix_secs() + 86_400).unwrap());
}

#[test]
fn automatic_sync_disabled_and_closed_products_make_no_provider_calls() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    assert_eq!(
        catalog_job(&seams).status,
        crate::reqresp::JobStatus::Succeeded
    );
    seams.set_setting("stripe.enabled", "true");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    let entry = super::store::find_by_handle(&seams, "cedros-individual")
        .unwrap()
        .unwrap();
    let mut payload = entry.payload.clone();
    payload["purchasable"] = json!(false);
    super::save(&seams, &entry, payload).unwrap();
    assert_eq!(
        catalog_job(&seams).status,
        crate::reqresp::JobStatus::Succeeded
    );
    assert!(seams.http_requests.borrow().is_empty());
}

#[test]
fn automatic_sync_rotates_past_failures_and_retries_on_next_sweep() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    let entry = super::store::find_by_handle(&seams, "cedros-individual")
        .unwrap()
        .unwrap();
    for index in 0..5 {
        let mut payload = entry.payload.clone();
        payload["stableHandle"] = json!(format!("plan-{index}"));
        payload["id"] = json!(format!("plan-{index}"));
        payload["slug"] = json!(format!("plan-{index}"));
        super::store::save(&seams, None, &format!("plan-{index}"), &payload).unwrap();
    }
    seams.set_setting("stripe.enabled", "true");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    for _ in 0..6 {
        seams.push_http_response(503, r#"{"error":{"message":"private provider detail"}}"#);
    }
    let first = catalog_job(&seams);
    assert_eq!(first.status, crate::reqresp::JobStatus::Retryable);
    assert_eq!(
        serde_json::from_str::<Value>(&first.details_json).unwrap()["nextOffset"],
        5
    );
    let second = catalog_job(&seams);
    assert_eq!(second.status, crate::reqresp::JobStatus::Retryable);
    assert_eq!(
        serde_json::from_str::<Value>(&second.details_json).unwrap()["nextOffset"],
        0
    );
    assert_eq!(seams.http_requests.borrow().len(), 6);
    let stored = super::store::find_by_handle(&seams, "cedros-individual")
        .unwrap()
        .unwrap();
    assert_eq!(stored.payload["metadata"][super::SYNC_STATUS], "error");
    assert!(!stored
        .payload
        .to_string()
        .contains("private provider detail"));
}

#[test]
fn sync_recovers_created_price_after_lost_local_save() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    // The provider has already created the product and prices, but the local
    // record contains only its durable product identity.
    for _ in 0..2 {
        seams.push_http_response(
            200,
            &crate::stripe::catalog_sync::product_response("prod_individual", true),
        );
    }
    for (id, amount, interval) in [
        ("price_annual", 22_800, "year"),
        ("price_monthly", 2_900, "month"),
    ] {
        let price: Value = serde_json::from_str(&stripe_price(id, amount, interval)).unwrap();
        seams.push_http_response(200, &json!({"data":[price],"has_more":false}).to_string());
    }
    let response = call(&seams, sync_request());
    assert_eq!(response.status, 200, "{}", response.body);
    assert_eq!(body(&response)["createdStripeProduct"], false);
    assert_eq!(body(&response)["createdStripePriceCount"], 0);
    assert_eq!(
        seams
            .http_requests
            .borrow()
            .iter()
            .filter(|request| request["method"] == "POST")
            .count(),
        1
    );
}

#[test]
fn sync_rejects_wrong_created_price_without_persisting_its_id() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    seams.push_http_response(404, r#"{"error":{}}"#);
    seams.push_http_response(
        200,
        &crate::stripe::catalog_sync::product_response("prod_individual", true),
    );
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_response(200, &stripe_price("price_wrong", 1, "year"));
    assert_eq!(call(&seams, sync_request()).status, 502);
    let entry = super::store::find_by_handle(&seams, "cedros-individual")
        .unwrap()
        .unwrap();
    assert!(entry.payload["prices"][0]["stripePriceId"].is_null());
}

#[test]
fn automatic_sync_replaces_changed_price_without_touching_old_price() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    seams.set_setting("stripe.enabled", "true");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    queue_initial_sync(&seams);
    assert_eq!(
        catalog_job(&seams).status,
        crate::reqresp::JobStatus::Succeeded
    );
    let entry = super::store::find_by_handle(&seams, "cedros-individual")
        .unwrap()
        .unwrap();
    let mut edited = entry.payload.clone();
    edited["prices"][1]["unitAmountCents"] = json!(3_900);
    super::save(&seams, &entry, edited).unwrap();
    for _ in 0..2 {
        seams.push_http_response(
            200,
            &crate::stripe::catalog_sync::product_response("prod_individual", true),
        );
    }
    seams.push_http_response(200, &stripe_price("price_annual", 22_800, "year"));
    seams.push_http_response(200, &stripe_price("price_monthly", 2_900, "month"));
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_response(200, &stripe_price("price_updated", 3_900, "month"));
    let result = catalog_job(&seams);
    assert_eq!(
        result.status,
        crate::reqresp::JobStatus::Succeeded,
        "{}",
        result.details_json
    );
    let updated = super::store::find_by_handle(&seams, "cedros-individual")
        .unwrap()
        .unwrap();
    assert_eq!(
        updated.payload["prices"][1]["stripePriceId"],
        "price_updated"
    );
    assert!(!seams
        .http_requests
        .borrow()
        .iter()
        .any(|request| request["method"] == "DELETE"));
    assert!(!seams
        .http_requests
        .borrow()
        .iter()
        .any(|request| request["method"] == "POST"
            && request["url"] == "https://api.stripe.com/v1/prices/price_monthly"));
}

#[test]
fn partial_sync_resumes_without_rechecking_already_verified_prices() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    seams.push_http_response(404, r#"{"error":{}}"#);
    seams.push_http_response(
        200,
        &crate::stripe::catalog_sync::product_response("prod_individual", true),
    );
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_response(200, &stripe_price("price_annual", 22_800, "year"));
    seams.push_http_response(503, r#"{"error":{}}"#);
    assert_eq!(call(&seams, sync_request()).status, 502);
    assert_eq!(seams.http_requests.borrow().len(), 5);
    for _ in 0..2 {
        seams.push_http_response(
            200,
            &crate::stripe::catalog_sync::product_response("prod_individual", true),
        );
    }
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_response(200, &stripe_price("price_monthly", 2_900, "month"));
    let response = call(&seams, sync_request());
    assert_eq!(response.status, 200, "{}", response.body);
    assert_eq!(seams.http_requests.borrow().len(), 9);
    assert_eq!(body(&response)["createdStripePriceCount"], 1);
}

#[test]
fn failed_first_publication_retains_durable_random_product_identity() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    let entry = super::store::find_by_handle(&seams, "cedros-individual")
        .unwrap()
        .unwrap();
    let mut payload = entry.payload.clone();
    payload["metadata"]
        .as_object_mut()
        .unwrap()
        .remove(super::PRODUCT_IDENTITY);
    super::save(&seams, &entry, payload).unwrap();
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    seams.push_http_response(503, r#"{"error":{}}"#);
    assert_eq!(call(&seams, sync_request()).status, 502);
    let saved = super::store::find_by_handle(&seams, "cedros-individual")
        .unwrap()
        .unwrap();
    let identity = saved.payload["metadata"][super::PRODUCT_IDENTITY]
        .as_str()
        .unwrap();
    assert!(identity.starts_with("prod_cedros_"));
    assert!(saved.payload["stripeProductId"].is_null());
    seams.push_http_response(503, r#"{"error":{}}"#);
    assert_eq!(call(&seams, sync_request()).status, 502);
    let requests = seams.http_requests.borrow();
    assert_eq!(requests[0]["url"], requests[1]["url"]);
}

#[test]
fn duplicate_active_price_handles_fail_before_provider_calls() {
    let seams = FakeSeams::new();
    seed_subscription_product(&seams);
    let entry = super::store::find_by_handle(&seams, "cedros-individual")
        .unwrap()
        .unwrap();
    let mut payload = entry.payload.clone();
    let duplicate = payload["prices"][0].clone();
    payload["prices"].as_array_mut().unwrap().push(duplicate);
    assert_eq!(super::price_handles(&payload).unwrap_err().status, 409);
    assert!(seams.http_requests.borrow().is_empty());
}
