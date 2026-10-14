use super::*;
use crate::{
    fake::FakeSeams,
    routes::canonical_checkout::test_support::{retrieval, setup},
};

const INTENT: &str = "ed02a5a6-f3d4-4f7c-8031-5b1ba14e1851";
const SESSION: &str = "cs_domain_1";

fn configured() -> (FakeSeams, RouteRequest) {
    configured_with(setup())
}

fn configured_with(s: FakeSeams) -> (FakeSeams, RouteRequest) {
    let resource = format!("domain-purchase-{INTENT}");
    s.seed(ids::MODEL_CATALOG, "cedros-standard-domain", json!({"id":"cedros-standard-domain","active":true,"public":false,"purchasable":false,"productType":"subscription", "prices":[{"id":"domain-annual","status":"active","billingInterval":"year","billingIntervalCount":1,"unitAmountCents":725,"currency":"USD"}]}));
    let req = RouteRequest { route_id:ROUTE.into(), method:"POST".into(),path:"/admin/domain-checkout".into(),
        body:json!({"intentId":INTENT,"buyerId":"buyer-1","resource":resource,"productId":"cedros-standard-domain","priceId":"domain-annual","amountCents":725,"currency":"USD","email":"buyer@example.com","returnUrl":"https://shop.example/domains"}).to_string(),
        context_json:json!({"siteId":"site-a","environment":"production","actorId":"cedros-domains-manager","principalId":"cedros-domains-manager","authenticated":true,"permissionClaims":[ids::ROUTE_ADMIN],"csrfVerified":true}).to_string(), ..Default::default() };
    (s, req)
}

fn start_with_lost_response(s: &FakeSeams, req: &RouteRequest) -> String {
    s.push_http_response(
        200,
        &json!({"id":SESSION,"url":"https://checkout.stripe.com/domain"}).to_string(),
    );
    s.push_http_response(503, r#"{"error":{"type":"api_error"}}"#);
    let error = handle(s, req).unwrap_err();
    assert_eq!(error.status, 502, "{error:?}");
    let requests = s.http_requests.borrow();
    let body = requests[0]["body"].as_str().unwrap();
    body.split('&')
        .find_map(|pair| pair.strip_prefix("metadata%5Bcedros_pay_operation_id%5D="))
        .unwrap()
        .to_string()
}

#[test]
fn checkout_recovers_a_lost_response_without_creating_another_session() {
    let (s, req) = configured();
    let operation = start_with_lost_response(&s, &req);
    s.set_now(s.now_unix_secs() + 16 * 60);
    let response = retrieval(&s, &operation, SESSION, "unpaid");
    s.push_http_response(200, &response);
    s.push_http_response(200, &response);
    let output = handle(&s, &req).unwrap();
    let value: Value = serde_json::from_str(&output.body).unwrap();
    assert_eq!(value["sessionId"], SESSION);
    assert_eq!(value["status"], "action_required");
    assert_eq!(value["url"], "https://checkout.stripe.com/resolved");
    assert_eq!(
        s.http_requests
            .borrow()
            .iter()
            .filter(|request| request["method"] == "POST")
            .count(),
        1
    );
    assert!(!output.body.contains("buyer@example.com"));
}

#[test]
fn only_authoritative_expired_unpaid_sessions_allow_a_new_quote() {
    let (s, req) = configured();
    let operation = start_with_lost_response(&s, &req);
    let mut response: Value =
        serde_json::from_str(&retrieval(&s, &operation, SESSION, "unpaid")).unwrap();
    response["status"] = json!("expired");
    s.push_http_response(200, &response.to_string());
    let output = handle(&s, &req).unwrap();
    let value: Value = serde_json::from_str(&output.body).unwrap();
    assert_eq!(value["status"], "expired");
    assert!(value["url"].is_null());
    response["id"] = json!("cs_wrong");
    s.push_http_response(200, &response.to_string());
    assert_eq!(handle(&s, &req).unwrap_err().status, 502);
}

#[test]
fn customers_cannot_impersonate_the_host_service_or_change_the_catalog_price() {
    for field in [
        "actorId",
        "principalId",
        "authenticated",
        "csrfVerified",
        "permissionClaims",
    ] {
        let (s, mut req) = configured();
        let mut ctx: Value = serde_json::from_str(&req.context_json).unwrap();
        ctx[field] = Value::Null;
        req.context_json = ctx.to_string();
        assert!(handle(&s, &req).is_err(), "must reject missing {field}");
        assert!(s.http_requests.borrow().is_empty());
    }
    let (s, mut req) = configured();
    let mut body: Value = serde_json::from_str(&req.body).unwrap();
    body["amountCents"] = json!(1);
    req.body = body.to_string();
    let error = handle(&s, &req).unwrap_err();
    assert_eq!(error.status, 409, "{error:?}");
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn unlisted_domain_products_remain_unavailable_to_public_checkout() {
    let (s, req) = configured();
    let context = RequestContext::parse(&req.context_json);
    let buyer = Buyer {
        user_id: "buyer-1".into(),
        claims: json!({}),
    };
    let facade = CanonicalCheckoutFacade::for_verified_buyer(&s, &context, &buyer).unwrap();
    let quote = json!({"schemaVersion":1,"idempotencyKey":"public-quote","attemptId":"public-attempt",
        "clientMaterialSha256":"1".repeat(64),"source":{"kind":"items","items":[{"resource":"cedros-standard-domain","qty":1}]},
        "customerContext":{"fulfillment":{"kind":"digital"},"returnUrls":{"success":"https://shop.example/done","cancel":"https://shop.example/back"}},"requestedPaymentMethods":["stripe"]});
    assert_eq!(
        facade
            .quote("public-quote", &quote.to_string())
            .unwrap_err()
            .status,
        422
    );
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn paid_registration_receipt_and_failed_registration_refund_are_correlated() {
    let (s, req) = configured();
    let operation = start_with_lost_response(&s, &req);
    crate::checkout_contract::settle_stripe_webhook(
        &s,
        &operation,
        SESSION,
        725,
        "USD",
        "pi_canonical",
    )
    .unwrap();
    s.push_http_response(200, &retrieval(&s, &operation, SESSION, "paid"));
    let recovered: Value = serde_json::from_str(&handle(&s, &req).unwrap().body).unwrap();
    assert_eq!(recovered["status"], "paid");
    assert_eq!(recovered["sessionId"], SESSION);
    assert!(recovered["url"].is_null());
    let order_req = RouteRequest {
        route_id: ids::ROUTE_ADMIN_ORDERS_GET.into(),
        method: "GET".into(),
        path: format!("/admin/orders/{SESSION}"),
        context_json: req.context_json.clone(),
        ..Default::default()
    };
    let order: Value =
        serde_json::from_str(&crate::router::handle_route(&s, order_req).body).unwrap();
    assert_eq!(order["order"]["status"], "paid");
    assert_eq!(
        order["order"]["resourceId"],
        format!("domain-purchase-{INTENT}")
    );
    assert_eq!(order["order"]["amount"], 725);
    s.push_http_response(200,r#"{"id":"re_domain","status":"succeeded","amount":725,"currency":"usd","payment_intent":"pi_canonical"}"#);
    let refund = RouteRequest {
        route_id: ids::ROUTE_ADMIN_STRIPE_REFUNDS_PROCESS.into(),
        method: "POST".into(),
        path: format!("/admin/stripe/refunds/{SESSION}/process"),
        context_json: req.context_json,
        ..Default::default()
    };
    let response = crate::router::handle_route(&s, refund);
    assert_eq!(response.status, 200, "{}", response.body);
    let value: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(value["status"], "succeeded");
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, SESSION).unwrap()["status"],
        "refunded"
    );
}

#[test]
fn wrong_price_identity_or_disabled_catalog_fails_before_payment() {
    for (field, value) in [
        ("priceId", json!("wrong-price")),
        ("productId", json!("wrong-product")),
        ("billing", json!({"planId":"unexpected"})),
        ("intentId", json!("------------------------------------")),
    ] {
        let (s, mut req) = configured();
        let mut body: Value = serde_json::from_str(&req.body).unwrap();
        body[field] = value;
        req.body = body.to_string();
        assert!(handle(&s, &req).is_err(), "must reject {field}");
        assert!(s.http_requests.borrow().is_empty());
    }
    let (s, req) = configured();
    let mut product = s
        .get_entry(ids::MODEL_CATALOG, "cedros-standard-domain")
        .unwrap();
    product["active"] = json!(false);
    s.seed(ids::MODEL_CATALOG, "cedros-standard-domain", product);
    assert!(handle(&s, &req).is_err());
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn missing_domain_checkout_authority_is_atomic_and_preserves_existing_values() {
    let s = FakeSeams::new();
    crate::guarded_policy::enroll(&s).unwrap();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    let (s, req) = configured_with(s);
    s.push_http_response(200, r#"{"id":"acct_domain_merchant","object":"account"}"#);
    let ctx = RequestContext::parse(&req.context_json);
    authority::initialize(&s, &ctx, INTENT, "https://shop.example/domains").unwrap();
    let mac = s
        .secret_get(ids::SECRET_CHECKOUT_CONTEXT_MAC)
        .unwrap()
        .unwrap();
    assert_eq!(mac.len(), 64);
    assert_eq!(
        s.secret_get(ids::SECRET_CHECKOUT_STRIPE_ACCOUNT)
            .unwrap()
            .unwrap(),
        "acct_domain_merchant"
    );
    assert_eq!(
        s.setting_get(ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS)
            .unwrap()
            .unwrap(),
        r#"["https://shop.example"]"#
    );
    let count = s.http_requests.borrow().len();
    authority::initialize(&s, &ctx, INTENT, "https://another.example/domains").unwrap();
    assert_eq!(s.http_requests.borrow().len(), count);
    assert_eq!(
        s.secret_get(ids::SECRET_CHECKOUT_CONTEXT_MAC)
            .unwrap()
            .unwrap(),
        mac
    );
    assert_eq!(
        s.setting_get(ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS)
            .unwrap()
            .unwrap(),
        r#"["https://shop.example"]"#
    );
    assert_eq!(s.http_requests.borrow()[0]["method"], "GET");
    assert_eq!(
        s.http_requests.borrow()[0]["url"],
        "https://api.stripe.com/v1/account"
    );
}

#[test]
fn account_discovery_failure_never_leaves_partial_checkout_authority() {
    let s = FakeSeams::new();
    crate::guarded_policy::enroll(&s).unwrap();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    let (_, req) = configured_with(FakeSeams::new());
    let ctx = RequestContext::parse(&req.context_json);
    s.push_http_response(401, r#"{"error":{"type":"authentication_error"}}"#);
    assert_eq!(
        authority::initialize(&s, &ctx, INTENT, "https://shop.example/domains")
            .unwrap_err()
            .status,
        502
    );
    assert!(s
        .setting_get(ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS)
        .unwrap()
        .is_none());
    assert!(s
        .secret_get(ids::SECRET_CHECKOUT_CONTEXT_MAC)
        .unwrap()
        .is_none());
    assert!(s
        .secret_get(ids::SECRET_CHECKOUT_STRIPE_ACCOUNT)
        .unwrap()
        .is_none());
}

#[test]
fn untrusted_service_cannot_seed_authority_or_append_return_origins() {
    let s = FakeSeams::new();
    let (_, req) = configured_with(FakeSeams::new());
    let mut ctx = RequestContext::parse(&req.context_json);
    ctx.principal_id = Some("customer".into());
    assert_eq!(
        authority::initialize(&s, &ctx, INTENT, "https://shop.example/domains")
            .unwrap_err()
            .status,
        403
    );
    assert!(s.http_requests.borrow().is_empty());
    assert!(s
        .setting_get(ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS)
        .unwrap()
        .is_none());
}

#[test]
fn first_domain_checkout_initializes_authority_then_recovers_the_same_session() {
    let s = FakeSeams::new();
    crate::guarded_policy::enroll(&s).unwrap();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_private");
    let (s, req) = configured_with(s);
    s.push_http_response(200, r#"{"id":"acct_domain_merchant","object":"account"}"#);
    s.push_http_response(
        200,
        &json!({"id":SESSION,"url":"https://checkout.stripe.com/domain"}).to_string(),
    );
    s.push_http_response(503, r#"{"error":{"type":"api_error"}}"#);
    assert_eq!(handle(&s, &req).unwrap_err().status, 502);
    let operation = s
        .http_requests
        .borrow()
        .iter()
        .find(|request| request["method"] == "POST")
        .unwrap()["body"]
        .as_str()
        .unwrap()
        .split('&')
        .find_map(|pair| pair.strip_prefix("metadata%5Bcedros_pay_operation_id%5D="))
        .unwrap()
        .to_string();
    let mac = s
        .secret_get(ids::SECRET_CHECKOUT_CONTEXT_MAC)
        .unwrap()
        .unwrap();
    s.set_now(s.now_unix_secs() + 16 * 60);
    let response = retrieval(&s, &operation, SESSION, "unpaid");
    s.push_http_response(200, &response);
    s.push_http_response(200, &response);
    let result: Value = serde_json::from_str(&handle(&s, &req).unwrap().body).unwrap();
    assert_eq!(result["sessionId"], SESSION);
    assert_eq!(result["url"], "https://checkout.stripe.com/resolved");
    assert_eq!(
        s.secret_get(ids::SECRET_CHECKOUT_CONTEXT_MAC)
            .unwrap()
            .unwrap(),
        mac
    );
    assert_eq!(
        s.http_requests
            .borrow()
            .iter()
            .filter(|request| request["method"] == "POST")
            .count(),
        1
    );
}

#[test]
fn domain_checkout_recovery_preserves_frozen_terms_after_catalog_price_changes() {
    let (s, req) = configured();
    let operation = start_with_lost_response(&s, &req);
    let mut product = s
        .get_entry(ids::MODEL_CATALOG, "cedros-standard-domain")
        .unwrap();
    product["prices"][0]["unitAmountCents"] = json!(999);
    s.seed(ids::MODEL_CATALOG, "cedros-standard-domain", product);
    let response = retrieval(&s, &operation, SESSION, "unpaid");
    s.push_http_response(200, &response);
    s.push_http_response(200, &response);
    let result: Value = serde_json::from_str(&handle(&s, &req).unwrap().body).unwrap();
    assert_eq!(result["sessionId"], SESSION);
    assert_eq!(result["url"], "https://checkout.stripe.com/resolved");
    assert_eq!(
        s.http_requests
            .borrow()
            .iter()
            .filter(|request| request["method"] == "POST")
            .count(),
        1
    );
}
