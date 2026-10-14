use super::*;
use crate::{
    fake::FakeSeams,
    reqresp::{RouteRequest, RouteResponse},
};
use serde_json::json;

pub(crate) fn physical(seams: &FakeSeams) {
    *seams.native_storefront_policy.borrow_mut() = Ok(RouteResponse::ok(&json!({
        "contractVersion":1, "mode":"physical", "selectedContributionIds":physical_contributions()
    })));
}

fn product() -> Value {
    json!({"id":"shirt", "title":"Shirt", "slug":"shirt", "active":true,
        "productType":"standard", "fulfillment":{"type":"physical","shippingProfileId":"goods"},
        "shippingProfileId":"goods", "fiatAmountCents":1200, "fiatCurrency":"USD"})
}
fn profile(seams: &FakeSeams) {
    seams.seed(
        ids::MODEL_CATALOG,
        "shipping_profile:goods",
        json!({"id":"goods","kind":"shippingProfile","active":true,"countries":["US"]}),
    );
}

#[test]
fn service_contract_is_exact_and_unrestricted_is_explicit() {
    let seams = FakeSeams::new();
    assert!(!Policy::load(&seams).unwrap().is_physical());
    let requests = seams.service_requests.borrow();
    let request = &requests[0];
    assert_eq!(request.target_extension_id, "cedros-data");
    assert_eq!(request.route_id, ROUTE);
    assert_eq!(request.capability_id, CAPABILITY);
    assert_eq!(request.method, "POST");
    assert_eq!(request.path, "/native-storefront-policy/v1/read");
    assert!(request.query.is_empty());
    assert_eq!(request.body_json, "{}");
}

#[test]
fn unavailable_malformed_unknown_or_incomplete_policy_fails_closed() {
    let seams = FakeSeams::new();
    *seams.native_storefront_policy.borrow_mut() = Err(crate::seams::HostError::new("offline"));
    assert_eq!(Policy::load(&seams).unwrap_err().status, 503);
    for body in [
        json!({}),
        json!({"contractVersion":2,"mode":"unrestricted","selectedContributionIds":[]}),
        json!({"contractVersion":1,"mode":"unknown","selectedContributionIds":[]}),
        json!({"contractVersion":1,"mode":"physical","selectedContributionIds":[]}),
        json!({"contractVersion":1,"mode":"unrestricted","selectedContributionIds":physical_contributions()}),
        json!({"contractVersion":1,"mode":"unrestricted","selectedContributionIds":[],"allowDigital":true}),
    ] {
        *seams.native_storefront_policy.borrow_mut() = Ok(RouteResponse::ok(&body));
        assert_eq!(Policy::load(&seams).unwrap_err().status, 503);
    }
    physical(&seams);
    assert!(Policy::load(&seams).unwrap().is_physical());
}

#[test]
fn classification_requires_saved_product_and_active_canonical_profile() {
    let seams = FakeSeams::new();
    assert!(!Classifier::new(&seams)
        .is_physical(&product(), "shirt")
        .unwrap());
    profile(&seams);
    assert!(Classifier::new(&seams)
        .is_physical(&product(), "shirt")
        .unwrap());
    for (pointer, value) in [
        ("/productType", json!("digital")),
        ("/fulfillment/type", json!("digital")),
        ("/fulfillment/shippingProfileId", json!("other")),
        ("/shippingProfileId", json!("missing")),
    ] {
        let mut record = product();
        *record.pointer_mut(pointer).unwrap() = value;
        record["commerceKind"] = json!("physical");
        assert!(!Classifier::new(&seams)
            .is_physical(&record, "shirt")
            .unwrap());
    }
    let mut record = product();
    record["variants"] = json!([{"id":"v1","fulfillment":{"type":"digital"}}]);
    assert!(!Classifier::new(&seams)
        .is_physical(&record, "shirt")
        .unwrap());
    for patch in [
        json!({"paymentResource":"digital-entitlement"}),
        json!({"subscription":{"interval":"month"}}),
        json!({"cryptoPrice":{"amount":"1","currency":"SOL"}}),
        json!({"prices":[{"unitAmountCents":1,"currency":"BTC"}]}),
    ] {
        let mut record = product();
        for (key, value) in patch.as_object().unwrap() {
            record[key] = value.clone();
        }
        assert!(!Classifier::new(&seams)
            .is_physical(&record, "shirt")
            .unwrap());
    }
    seams.seed(
        ids::MODEL_CATALOG,
        "shipping_profile:goods",
        json!({"id":"goods","kind":"shippingProfile","active":false}),
    );
    assert!(!Classifier::new(&seams)
        .is_physical(&product(), "shirt")
        .unwrap());
}

#[test]
fn physical_mode_filters_catalog_before_categories_counts_and_pagination() {
    let seams = FakeSeams::new();
    physical(&seams);
    profile(&seams);
    let mut record = product();
    record["categoryIds"] = json!(["goods"]);
    seams.seed(ids::MODEL_CATALOG, "shirt", record);
    seams.seed(ids::MODEL_CATALOG, "digital", json!({"active":true,"id":"digital","title":"Download","slug":"download","commerceKind":"physical","categoryIds":["downloads"],"sortOrder":-1}));
    let request = RouteRequest { route_id:ids::ROUTE_PRODUCT_READ.into(), method:"GET".into(), path:"/products/v1/catalog".into(), query:vec![("limit".into(),"1".into())], context_json:json!({"siteId":"s","authenticated":true,"permissionClaims":["cedros-pay:product-read"]}).to_string(), ..Default::default() };
    let response = crate::routes::products::handle(&seams, &request).unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(body["products"][0]["id"], "shirt");
    assert_eq!(body["products"][0]["commerceKind"], "physical");
    assert_eq!(body["categories"].as_array().unwrap().len(), 1);
    assert_eq!(body["categories"][0]["id"], "goods");
    assert_eq!(body["pagination"]["hasMore"], false);
    *seams.native_storefront_policy.borrow_mut() = Ok(RouteResponse::ok(
        &json!({"contractVersion":1,"mode":"unrestricted","selectedContributionIds":[]}),
    ));
    let response = crate::routes::products::handle(&seams, &request).unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(body["products"][0]["id"], "digital");
    assert_eq!(body["products"][0]["commerceKind"], "other");
    assert_eq!(body["pagination"]["hasMore"], true);
}

#[test]
fn every_legacy_purchase_route_is_blocked_before_money_or_provider_work() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    physical(&seams);
    for route in crate::router::list_routes()
        .iter()
        .filter(|route| restricted_route(route.route_id))
    {
        let req = RouteRequest {
            route_id: route.route_id.into(),
            method: route.method.into(),
            path: route.path.into(),
            body: "{}".into(),
            ..Default::default()
        };
        let response = crate::router::handle_route(&seams, req);
        assert_eq!(
            response.status, 403,
            "{}: {}",
            route.route_id, response.body
        );
        assert!(
            response.body.contains("native_storefront_physical_only"),
            "{}: {}",
            route.route_id,
            response.body
        );
    }
    assert!(seams.http_requests.borrow().is_empty());
    assert!(seams.provider_requests.borrow().is_empty());
    assert!(seams.secret_reads.borrow().is_empty());
}

#[test]
fn historical_reads_cancellations_refunds_and_callbacks_are_not_purchase_routes() {
    for route in [
        ids::ROUTE_PAYMENTS,
        ids::ROUTE_PURCHASES,
        ids::ROUTE_CHECKOUT_STATUS,
        ids::ROUTE_CHECKOUT_RETURN_VERIFY,
        ids::ROUTE_SUBSCRIPTIONS_STATUS,
        ids::ROUTE_SUBSCRIPTIONS_CANCEL,
        ids::ROUTE_BUYER_SUBSCRIPTION_CANCEL,
        ids::ROUTE_REFUNDS_REQUEST,
        ids::ROUTE_ADMIN_REFUNDS_PROCESS,
        ids::ROUTE_WEBHOOKS,
        ids::ROUTE_NATIVE_STORE_APPLE_NOTIFICATION,
        ids::ROUTE_NATIVE_STORE_GOOGLE_NOTIFICATION,
    ] {
        assert!(!restricted_route(route), "{route}");
    }
}

#[test]
fn mismatched_read_route_id_cannot_hide_subscription_purchase_path() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    physical(&seams);
    let request = RouteRequest {
        route_id: ids::ROUTE_SUBSCRIPTIONS_STATUS.into(),
        method: "post".into(),
        path: "/extensions/cedros-pay/subscription/v1/create".into(),
        body: "{}".into(),
        ..Default::default()
    };
    let error = crate::routes::subscriptions::handle(&seams, &request).unwrap_err();
    assert_eq!(error.code, "native_storefront_physical_only");
    assert!(seams.http_requests.borrow().is_empty());
}

#[test]
fn hidden_credits_purchase_paths_cannot_hide_behind_published_balance_id() {
    for path in ["/credits/v1/authorize", "/credits/v1/hold"] {
        for prefix in ["", "/extensions/cedros-pay"] {
            let seams = FakeSeams::new();
            physical(&seams);
            seams.set_secret(ids::SECRET_RP_TOKEN, "rp");
            seams.seed(
                ids::MODEL_CREDITS,
                "acct:buyer",
                json!({"subjectId":"buyer","balanceCents":1000,"heldCents":0,"currency":"USD"}),
            );
            let request = RouteRequest {
                route_id:ids::ROUTE_CREDITS_BALANCE.into(), method:"post".into(), path:format!("{prefix}{path}"),
                headers:vec![("authorization".into(),"Bearer rp".into())],
                body:json!({"subjectId":"buyer","amountCents":100,"sourceRef":"attempt","holdId":"attempt"}).to_string(),
                ..Default::default()
            };
            let before = seams.get_entry(ids::MODEL_CREDITS, "acct:buyer");
            let response = crate::router::handle_route(&seams, request.clone());
            assert_eq!(response.status, 403, "{path}: {}", response.body);
            assert!(response.body.contains("native_storefront_physical_only"));
            assert_eq!(
                crate::routes::credits::handle(&seams, &request)
                    .unwrap_err()
                    .code,
                "native_storefront_physical_only"
            );
            assert_eq!(seams.get_entry(ids::MODEL_CREDITS, "acct:buyer"), before);
            assert_eq!(seams.db_batch_request_count(), 0);
            assert!(seams.secret_reads.borrow().is_empty());
            assert!(seams.http_requests.borrow().is_empty());
            assert!(seams.provider_requests.borrow().is_empty());
        }
    }
}

#[test]
fn authoritative_reserved_capacity_key_cannot_be_hidden_by_spoofed_payload_identity() {
    let seams = FakeSeams::new();
    profile(&seams);
    let product = product();
    assert_eq!(product["id"], "shirt");
    assert!(!Classifier::new(&seams)
        .is_physical(&product, "cedros-addon-managed-credits-v2")
        .unwrap());
    assert!(Classifier::new(&seams)
        .is_physical(&product, "shirt")
        .unwrap());
}
