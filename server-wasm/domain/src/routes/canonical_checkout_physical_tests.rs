use super::test_support::*;
use super::*;
use crate::{fake::FakeSeams, ids, reqresp::RouteResponse};
use serde_json::{json, Value};

fn physical(seams: &FakeSeams) {
    *seams.native_storefront_policy.borrow_mut() = Ok(RouteResponse::ok(&json!({
        "contractVersion":1,"mode":"physical","selectedContributionIds":crate::native_storefront_policy::physical_contributions()
    })));
}
fn setup_physical() -> FakeSeams {
    let seams = setup();
    physical(&seams);
    seams.seed(ids::MODEL_CATALOG, "product-1", json!({
        "id":"product-1","active":true,"title":"Physical product","price":{"amountCents":725,"currency":"USD"},
        "productType":"standard","shippingProfileId":"goods","fulfillment":{"type":"physical","shippingProfileId":"goods"}
    }));
    seams.seed(
        ids::MODEL_CATALOG,
        "shipping_profile:goods",
        json!({"kind":"shippingProfile","id":"goods","active":true,"countries":["US"]}),
    );
    seams.seed(ids::MODEL_CATALOG, "shipping_rate:ground", json!({"kind":"shippingRate","id":"ground","profileId":"goods","rateType":"flat","amountCents":500,"currency":"USD","active":true}));
    seams
}
fn shipping_body(body: String) -> String {
    let mut body: Value = serde_json::from_str(&body).unwrap();
    body["customerContext"]["fulfillment"] = json!({"kind":"shipping","address":{"line1":"1 Main","city":"Town","postalCode":"90210","country":"US"},"shipping":{"optionId":"ground"}});
    body.to_string()
}
fn physical_quote(seams: &FakeSeams, key: &str) -> Value {
    queue_auth(seams, "buyer-1");
    ok_json(
        handle(
            seams,
            &request(
                ROUTE_QUOTE,
                "POST",
                "/checkout/quote",
                shipping_body(quote_body(key, json!(["stripe"]))),
                Some(key),
                "site-a",
            ),
        )
        .unwrap(),
    )
}
fn create(seams: &FakeSeams, quote: &Value, shipping: bool) -> (RouteRequest, Value) {
    queue_auth(seams, "buyer-1");
    seams.push_http_response(
        200,
        r#"{"id":"cs_physical","url":"https://checkout.stripe.com/physical"}"#,
    );
    let body = checkout_body(
        "physical-create",
        quote["operationId"].as_str().unwrap(),
        "stripe",
        None,
    );
    let req = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        if shipping { shipping_body(body) } else { body },
        Some("physical-create"),
        "site-a",
    );
    let result = ok_json(handle(seams, &req).unwrap());
    (req, result)
}

#[test]
fn physical_card_quote_checkout_replay_and_recovery_work_end_to_end() {
    let seams = setup_physical();
    let quote = physical_quote(&seams, "physical-quote");
    assert_eq!(quote["quote"]["shippingCents"], 500);
    assert_eq!(quote["quote"]["totalCents"], 2000);
    assert_eq!(physical_quote(&seams, "physical-quote")["replayed"], true);
    let (create_req, created) = create(&seams, &quote, true);
    assert_eq!(created["status"], "action_required");
    let before = seams.http_requests.borrow().len();
    queue_auth(&seams, "buyer-1");
    assert_eq!(
        ok_json(handle(&seams, &create_req).unwrap())["replayed"],
        true
    );
    assert_eq!(seams.http_requests.borrow().len(), before + 1);
    let operation = created["operationId"].as_str().unwrap();
    let artifact = created["returnArtifact"].as_str().unwrap();
    queue_auth(&seams, "buyer-1");
    seams.push_http_response(200, &retrieval(&seams, operation, artifact, "unpaid"));
    let req = request(
        ROUTE_RESOLVE,
        "POST",
        "/checkout/resolve",
        resolve_body(operation, artifact),
        None,
        "site-a",
    );
    assert_eq!(ok_json(handle(&seams, &req).unwrap())["status"], "resolved");
    queue_auth(&seams, "buyer-1");
    seams.push_http_response(200, &retrieval(&seams, operation, artifact, "paid"));
    let req = request(
        ROUTE_RETURN_VERIFY,
        "POST",
        "/checkout/return/verify",
        verify_body(artifact),
        None,
        "site-a",
    );
    assert_eq!(ok_json(handle(&seams, &req).unwrap())["status"], "verified");
}

#[test]
fn physical_quote_rejects_nonphysical_catalog_forged_markers_digital_intent_and_nonfiat_rails() {
    for methods in [
        json!(["x402"]),
        json!(["credits"]),
        json!(["stripe", "credits"]),
    ] {
        let seams = setup_physical();
        queue_auth(&seams, "buyer-1");
        let req = request(
            ROUTE_QUOTE,
            "POST",
            "/checkout/quote",
            shipping_body(quote_body("bad-rail", methods)),
            Some("bad-rail"),
            "site-a",
        );
        assert_eq!(
            handle(&seams, &req).unwrap_err().code,
            "native_storefront_physical_only"
        );
        assert_eq!(seams.http_requests.borrow().len(), 1);
    }
    let seams = setup_physical();
    queue_auth(&seams, "buyer-1");
    let req = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        quote_body("digital-intent", json!(["stripe"])),
        Some("digital-intent"),
        "site-a",
    );
    assert_eq!(handle(&seams, &req).unwrap_err().status, 403);
    seams.seed(ids::MODEL_CATALOG,"product-1",json!({"id":"product-1","active":true,"title":"Download","commerceKind":"physical","productType":"standard","shippingProfileId":"goods","fulfillment":{"type":"digital"},"price":{"amountCents":725,"currency":"USD"}}));
    queue_auth(&seams, "buyer-1");
    let req = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        shipping_body(quote_body("forged-product", json!(["stripe"]))),
        Some("forged-product"),
        "site-a",
    );
    assert_eq!(handle(&seams, &req).unwrap_err().status, 403);
}

#[test]
fn policy_changes_close_digital_quote_replay_checkout_and_recovery_but_keep_history_and_paid_settlement(
) {
    let seams = setup();
    let quote = quote(&seams, "old-digital-quote", "site-a");
    let (create_req, created) = create(&seams, &quote, false);
    physical(&seams);
    queue_auth(&seams, "buyer-1");
    let replay = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        quote_body("old-digital-quote", json!(["stripe"])),
        Some("old-digital-quote"),
        "site-a",
    );
    assert_eq!(handle(&seams, &replay).unwrap_err().status, 403);
    queue_auth(&seams, "buyer-1");
    assert_eq!(handle(&seams, &create_req).unwrap_err().status, 403);
    let operation = created["operationId"].as_str().unwrap();
    let artifact = created["returnArtifact"].as_str().unwrap();
    queue_auth(&seams, "buyer-1");
    let resolve = request(
        ROUTE_RESOLVE,
        "POST",
        "/checkout/resolve",
        resolve_body(operation, artifact),
        None,
        "site-a",
    );
    let before = seams.http_requests.borrow().len();
    assert_eq!(handle(&seams, &resolve).unwrap_err().status, 403);
    assert_eq!(
        seams.http_requests.borrow().len(),
        before + 1,
        "blocked before payment-provider egress"
    );
    queue_auth(&seams, "buyer-1");
    let status = request(
        ROUTE_STATUS,
        "GET",
        &format!("/checkout/{operation}"),
        String::new(),
        None,
        "site-a",
    );
    assert_eq!(
        ok_json(handle(&seams, &status).unwrap())["status"],
        "action_required"
    );
    queue_auth(&seams, "buyer-1");
    seams.push_http_response(200, &retrieval(&seams, operation, artifact, "paid"));
    let verify = request(
        ROUTE_RETURN_VERIFY,
        "POST",
        "/checkout/return/verify",
        verify_body(artifact),
        None,
        "site-a",
    );
    assert_eq!(
        ok_json(handle(&seams, &verify).unwrap())["status"],
        "verified"
    );
    queue_auth(&seams, "buyer-1");
    assert_eq!(ok_json(handle(&seams, &status).unwrap())["status"], "paid");
}

#[test]
fn policy_outage_and_saved_profile_deactivation_block_new_checkout_before_provider_work() {
    let seams = setup_physical();
    let quote = physical_quote(&seams, "policy-outage");
    *seams.native_storefront_policy.borrow_mut() = Err(crate::HostError::new("offline"));
    queue_auth(&seams, "buyer-1");
    let req = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        shipping_body(checkout_body(
            "outage-create",
            quote["operationId"].as_str().unwrap(),
            "stripe",
            None,
        )),
        Some("outage-create"),
        "site-a",
    );
    let before = seams.http_requests.borrow().len();
    assert_eq!(
        handle(&seams, &req).unwrap_err().code,
        "native_storefront_policy_unavailable"
    );
    assert_eq!(seams.http_requests.borrow().len(), before + 1);
    physical(&seams);
    seams.seed(
        ids::MODEL_CATALOG,
        "shipping_profile:goods",
        json!({"kind":"shippingProfile","id":"goods","active":false,"countries":["US"]}),
    );
    queue_auth(&seams, "buyer-1");
    assert_eq!(handle(&seams, &req).unwrap_err().status, 403);
}

#[test]
fn pending_historical_payment_alias_cannot_be_recovered_after_product_is_repaired() {
    let seams = setup_physical();
    *seams.native_storefront_policy.borrow_mut() = Ok(RouteResponse::ok(&json!({
        "contractVersion":1,"mode":"unrestricted","selectedContributionIds":[]
    })));
    let mut product = seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap();
    product["paymentResource"] = json!("digital-entitlement");
    seams.seed(ids::MODEL_CATALOG, "product-1", product.clone());
    let quote = physical_quote(&seams, "historical-alias");
    let (_, created) = create(&seams, &quote, true);
    product["paymentResource"] = json!("product-1");
    seams.seed(ids::MODEL_CATALOG, "product-1", product);
    physical(&seams);
    queue_auth(&seams, "buyer-1");
    let req = request(
        ROUTE_RESOLVE,
        "POST",
        "/checkout/resolve",
        resolve_body(
            created["operationId"].as_str().unwrap(),
            created["returnArtifact"].as_str().unwrap(),
        ),
        None,
        "site-a",
    );
    let before = seams.http_requests.borrow().len();
    assert_eq!(
        handle(&seams, &req).unwrap_err().code,
        "native_storefront_physical_only"
    );
    assert_eq!(seams.http_requests.borrow().len(), before + 1);
}

#[test]
fn pending_checkout_cannot_recover_under_a_replacement_shipping_profile() {
    let seams = setup_physical();
    let quote = physical_quote(&seams, "shipping-profile-drift");
    let (create_req, created) = create(&seams, &quote, true);
    let mut product = seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap();
    product["shippingProfileId"] = json!("replacement");
    product["fulfillment"]["shippingProfileId"] = json!("replacement");
    seams.seed(ids::MODEL_CATALOG, "product-1", product);
    seams.seed(
        ids::MODEL_CATALOG,
        "shipping_profile:goods",
        json!({"id":"goods","kind":"shippingProfile","active":false,"countries":["US"]}),
    );
    seams.seed(
        ids::MODEL_CATALOG,
        "shipping_profile:replacement",
        json!({"id":"replacement","kind":"shippingProfile","active":true,"countries":["US"]}),
    );
    queue_auth(&seams, "buyer-1");
    let before = seams.http_requests.borrow().len();
    assert_eq!(
        handle(&seams, &create_req).unwrap_err().code,
        "native_storefront_physical_only"
    );
    assert_eq!(seams.http_requests.borrow().len(), before + 1);
    queue_auth(&seams, "buyer-1");
    let req = request(
        ROUTE_RESOLVE,
        "POST",
        "/checkout/resolve",
        resolve_body(
            created["operationId"].as_str().unwrap(),
            created["returnArtifact"].as_str().unwrap(),
        ),
        None,
        "site-a",
    );
    let before = seams.http_requests.borrow().len();
    assert_eq!(
        handle(&seams, &req).unwrap_err().code,
        "native_storefront_physical_only"
    );
    assert_eq!(seams.http_requests.borrow().len(), before + 1);
}

fn inactive_profile() -> Value {
    json!({"kind":"shippingProfile","id":"goods","active":false,"countries":["US"]})
}

#[test]
fn physical_checkout_claim_and_first_provider_attempt_fence_catalog_and_shipping_races() {
    for target in ["shipping_profile:goods", "product-1"] {
        for preceding_writes in [1, 2] {
            let seams = setup_physical();
            let quote = physical_quote(&seams, "physical-claim-race");
            // HTTP rate accounting is first; the initial checkout claim is
            // second, and the provider-attempt transition is third.
            for _ in 0..preceding_writes {
                seams.queue_guarded_race(vec![]);
            }
            let payload = if target == "product-1" {
                json!({"id":"product-1","active":true,"title":"Now digital","productType":"standard","fulfillment":{"type":"digital"},"price":{"amountCents":725,"currency":"USD"}})
            } else {
                inactive_profile()
            };
            seams.queue_guarded_race(vec![(ids::MODEL_CATALOG, target, payload)]);
            queue_auth(&seams, "buyer-1");
            let req = request(
                ROUTE_CREATE,
                "POST",
                "/checkout",
                shipping_body(checkout_body(
                    "physical-race-checkout",
                    quote["operationId"].as_str().unwrap(),
                    "stripe",
                    None,
                )),
                Some("physical-race-checkout"),
                "site-a",
            );
            let before = seams.http_requests.borrow().len();
            let error = handle(&seams, &req).unwrap_err();
            assert_eq!(
                error.status, 409,
                "{target} at write {preceding_writes}: {error:?}"
            );
            assert_eq!(
                seams.http_requests.borrow().len(),
                before + 1,
                "only authentication may egress"
            );
            let last = seams.last_db_batch_request().unwrap();
            assert!(last["conditions"]
                .as_array()
                .unwrap()
                .iter()
                .any(|condition| condition["entryKey"] == target
                    && condition["predicate"] == "version"));
        }
    }
}

#[test]
fn physical_indeterminate_retry_fences_authority_before_repeated_provider_attempt() {
    let seams = setup_physical();
    let quote = physical_quote(&seams, "physical-indeterminate");
    let req = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        shipping_body(checkout_body(
            "physical-retry",
            quote["operationId"].as_str().unwrap(),
            "stripe",
            None,
        )),
        Some("physical-retry"),
        "site-a",
    );
    queue_auth(&seams, "buyer-1");
    seams.push_http_response(500, r#"{"error":{"type":"api_error"}}"#);
    assert_eq!(
        ok_json(handle(&seams, &req).unwrap())["status"],
        "indeterminate"
    );
    let now = crate::seams::HostSeams::now_unix_secs(&seams);
    seams.set_now(now + crate::checkout_contract::LEASE_SECONDS + 1);
    seams.queue_guarded_race(vec![]); // Rate accounting
    seams.queue_guarded_race(vec![]); // Reacquire the indeterminate operation
    seams.queue_guarded_race(vec![(
        ids::MODEL_CATALOG,
        "shipping_profile:goods",
        inactive_profile(),
    )]);
    queue_auth(&seams, "buyer-1");
    let before = seams.http_requests.borrow().len();
    let error = handle(&seams, &req).unwrap_err();
    assert_eq!(error.status, 409);
    assert_eq!(
        seams.http_requests.borrow().len(),
        before + 1,
        "retry must not issue a second provider POST"
    );
    assert!(seams.last_db_batch_request().unwrap()["conditions"]
        .as_array()
        .unwrap()
        .iter()
        .any(|condition| condition["entryKey"] == "shipping_profile:goods"));
}

#[test]
fn physical_quote_reserves_the_additional_checkout_authority_condition() {
    for count in [29, 30] {
        let seams = setup_physical();
        let product = seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap();
        let mut items = Vec::new();
        for index in 0..count {
            let id = format!("physical-{index:02}");
            let mut saved = product.clone();
            saved["id"] = json!(id);
            seams.seed(ids::MODEL_CATALOG, &id, saved);
            items.push(json!({"resource":id,"qty":1}));
        }
        let mut body: Value = serde_json::from_str(&shipping_body(quote_body(
            "physical-condition-budget",
            json!(["stripe"]),
        )))
        .unwrap();
        body["source"]["items"] = json!(items);
        queue_auth(&seams, "buyer-1");
        let req = request(
            ROUTE_QUOTE,
            "POST",
            "/checkout/quote",
            body.to_string(),
            Some("physical-condition-budget"),
            "site-a",
        );
        let result = handle(&seams, &req);
        if count == 30 {
            assert_eq!(result.unwrap_err().code, "inventory_condition_limit");
        } else {
            let quote = ok_json(result.unwrap());
            let (_, created) = create(&seams, &quote, true);
            assert_eq!(created["status"], "action_required");
        }
    }
}
