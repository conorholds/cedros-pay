use serde_json::json;

use crate::db::Db;
use crate::fake::FakeSeams;
use crate::ids;
use crate::models::SubscriptionRecord;
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;

fn record(status: &str, period: &str, cancel: bool) -> SubscriptionRecord {
    SubscriptionRecord {
        subscription_id: "sub_1".into(),
        customer_ref: "cus_1".into(),
        stripe_customer_id: None,
        price_id: "price-1".into(),
        status: status.into(),
        provider: "stripe".into(),
        provider_ref: Some("sub_1".into()),
        current_period_end: Some(period.into()),
        cancel_at_period_end: cancel,
        last_provider_event_at: None,
        created_at: "2026-01-01T00:00:00Z".into(),
        updated_at: "2026-01-01T00:00:00Z".into(),
    }
}

#[test]
fn operation_identity_replays_exactly_and_rejects_changed_facts() {
    let seams = FakeSeams::new();
    let db = Db::new(&seams, ids::DB_ACCESS);
    let first = super::subscription_store::claim(
        &db,
        "create",
        "idem-1",
        json!({ "customerRef": "c1", "priceId": "p1" }),
        seams.now_unix_secs(),
    )
    .unwrap();
    let exact = super::subscription_store::claim(
        &db,
        "create",
        "idem-1",
        json!({ "priceId": "p1", "customerRef": "c1" }),
        seams.now_unix_secs(),
    )
    .unwrap();
    assert_eq!(first.fingerprint, exact.fingerprint);
    let error = super::subscription_store::claim(
        &db,
        "create",
        "idem-1",
        json!({ "customerRef": "c1", "priceId": "p2" }),
        seams.now_unix_secs(),
    )
    .err()
    .expect("changed facts must conflict");
    assert_eq!((error.status, error.code), (409, "conflict"));
}

#[test]
fn competing_projection_has_one_winner_and_no_partial_loser() {
    let seams = FakeSeams::new();
    let db = Db::new(&seams, ids::DB_ACCESS);
    let winner = serde_json::to_value(record("active", "2027-01-01T00:00:00Z", false)).unwrap();
    let mut winner_claimed = winner.clone();
    winner_claimed["subscriptionClaim"] = json!({ "schemaVersion": 1, "fingerprint": "winner" });
    seams.queue_guarded_race(vec![(ids::MODEL_SUBSCRIPTIONS, "sub_1", winner_claimed)]);
    let error = super::subscription_store::insert_projection(
        &db,
        "sub_1",
        serde_json::to_value(record("active", "2026-06-01T00:00:00Z", false)).unwrap(),
        "loser",
    )
    .unwrap_err();
    assert_eq!(error.status, 409);
    let stored = seams.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
    assert_eq!(stored["currentPeriodEnd"], "2027-01-01T00:00:00Z");
    assert_eq!(stored["subscriptionClaim"]["fingerprint"], "winner");
}

#[test]
fn stale_projection_cannot_reactivate_terminal_or_shorten_period() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_1",
        serde_json::to_value(record("active", "2026-06-01T00:00:00Z", false)).unwrap(),
    );
    let db = Db::new(&seams, ids::DB_ACCESS);
    let stale = db
        .read_one(ids::MODEL_SUBSCRIPTIONS, "sub_1")
        .unwrap()
        .unwrap();
    seams.queue_guarded_race(vec![(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_1",
        serde_json::to_value(record("canceled", "2027-01-01T00:00:00Z", true)).unwrap(),
    )]);
    let applied = super::subscription_store::update_monotonic(
        &db,
        &stale,
        record("active", "2026-08-01T00:00:00Z", false),
    )
    .unwrap();
    assert!(!applied, "newer terminal projection already dominates");
    let stored = seams.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
    assert_eq!(stored["status"], "canceled");
    assert_eq!(stored["currentPeriodEnd"], "2027-01-01T00:00:00Z");
    assert_eq!(stored["cancelAtPeriodEnd"], true);
}

fn create_request(price: &str) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_SUBSCRIPTIONS_CREATE.into(),
        method: "POST".into(),
        path: "/subscription/v1/create".into(),
        headers: vec![("authorization".into(), "Bearer rp".into())],
        body: json!({ "customerRef": "cus_1", "priceId": price }).to_string(),
        context_json: json!({ "siteId":"site-a","idempotencyKey": "create-idem" }).to_string(),
        ..Default::default()
    }
}

#[test]
fn create_provider_crash_retries_same_identity_and_mismatch_never_egresses() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_RP_TOKEN, "rp");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    seams.push_http_error("provider response lost");
    assert_eq!(
        super::subscriptions::handle(&seams, &create_request("price_1"))
            .unwrap_err()
            .status,
        500
    );
    let mismatch = super::subscriptions::handle(&seams, &create_request("price_2")).unwrap_err();
    assert_eq!(mismatch.status, 409);
    assert_eq!(seams.http_requests.borrow().len(), 1);
    seams.push_http_response(
        200,
        r#"{"id":"sub_1","customer":"cus_1","status":"active","current_period_end":1800000000,"cancel_at_period_end":false,"items":{"data":[{"price":{"id":"price_1"}}]}}"#,
    );
    assert_eq!(
        super::subscriptions::handle(&seams, &create_request("price_1"))
            .unwrap()
            .status,
        201
    );
    assert_eq!(seams.event_count(ids::EVENT_SUBSCRIPTION_STARTED), 1);
}

#[test]
fn cancel_race_preserves_newer_terminal_state_and_emits_after_commit() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_RP_TOKEN, "rp");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    seams.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_1",
        serde_json::to_value(record("active", "2026-06-01T00:00:00Z", false)).unwrap(),
    );
    seams.queue_guarded_race(vec![(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_1",
        serde_json::to_value(record("canceled", "2027-01-01T00:00:00Z", true)).unwrap(),
    )]);
    seams.push_http_response(
        200,
        r#"{"id":"sub_1","customer":"cus_1","status":"active","current_period_end":1780000000,"cancel_at_period_end":true}"#,
    );
    let request = RouteRequest {
        route_id: ids::ROUTE_SUBSCRIPTIONS_CANCEL.into(),
        method: "POST".into(),
        path: "/subscription/v1/cancel".into(),
        headers: vec![("authorization".into(), "Bearer rp".into())],
        body: json!({ "subscriptionId": "sub_1" }).to_string(),
        context_json: json!({ "siteId":"site-a","idempotencyKey": "cancel-idem" }).to_string(),
        ..Default::default()
    };
    super::subscriptions::handle(&seams, &request).unwrap();
    let stored = seams.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
    assert_eq!(stored["status"], "canceled");
    assert_eq!(stored["currentPeriodEnd"], "2027-01-01T00:00:00Z");
    assert_eq!(
        seams.event_count(ids::EVENT_SUBSCRIPTION_CANCELED),
        0,
        "dominated stale update emits no duplicate terminal event"
    );
}

fn catalog_session_request(success_url: &str) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_SUBSCRIPTION_STRIPE_SESSION.into(),
        method: "POST".into(),
        path: "/paywall/v1/subscription/stripe-session".into(),
        body: json!({ "resource": "plan-1", "successUrl": success_url,
            "cancelUrl": "https://shop.example/cancel" })
        .to_string(),
        context_json: json!({ "siteId":"site-a","idempotencyKey": "session-idem" }).to_string(),
        ..Default::default()
    }
}

#[test]
fn hosted_session_lost_response_retries_exact_identity_and_rejects_mismatch() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    seams.seed(
        ids::MODEL_CATALOG,
        "plan-1",
        json!({ "id": "plan-1", "displayName": "Plan", "price": { "amountCents": 500,
            "currency": "USD" }, "subscription": { "interval": "monthly", "trialDays": 7 } }),
    );
    seams.push_http_error("provider response lost after idempotent request");
    let exact = catalog_session_request("https://shop.example/success");
    assert_eq!(
        super::subscription_session::handle(&seams, &exact)
            .unwrap_err()
            .status,
        500
    );
    let mismatch = catalog_session_request("https://shop.example/different");
    assert_eq!(
        super::subscription_session::handle(&seams, &mismatch)
            .unwrap_err()
            .status,
        409
    );
    assert_eq!(seams.http_requests.borrow().len(), 1);
    seams.push_http_response(
        200,
        r#"{"id":"cs_sub","url":"https://checkout.stripe.com/sub"}"#,
    );
    let response = super::subscription_session::handle(&seams, &exact).unwrap();
    assert_eq!(response.status, 200);
}

fn portal_request(return_url: &str) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_SUBSCRIPTIONS_PORTAL.into(),
        method: "POST".into(),
        path: "/subscription/v1/portal".into(),
        headers: vec![("authorization".into(), "Bearer rp".into())],
        body: json!({ "subscriptionId": "sub_1", "returnUrl": return_url }).to_string(),
        context_json: json!({ "siteId":"site-a","idempotencyKey": "portal-idem" }).to_string(),
        ..Default::default()
    }
}

#[test]
fn portal_lost_response_retries_exact_identity_without_changed_redirect() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_RP_TOKEN, "rp");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    seams.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_1",
        serde_json::to_value(record("active", "2027-01-01T00:00:00Z", false)).unwrap(),
    );
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_error("provider response lost");
    let exact = portal_request("https://shop.example/account");
    assert_eq!(
        super::subscriptions::handle(&seams, &exact)
            .unwrap_err()
            .status,
        500
    );
    assert_eq!(
        super::subscriptions::handle(&seams, &portal_request("https://attacker.example/changed"))
            .unwrap_err()
            .status,
        409
    );
    seams.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    seams.push_http_response(200, r#"{"url":"https://billing.stripe.com/session"}"#);
    assert_eq!(
        super::subscriptions::handle(&seams, &exact).unwrap().status,
        200
    );
}

#[test]
fn reconciliation_race_cannot_restore_access_over_newer_delinquency() {
    let s = FakeSeams::new();
    s.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_1",
        serde_json::to_value(record("past_due", "2026-06-01T00:00:00Z", false)).unwrap(),
    );
    let db = Db::new(&s, ids::DB_ACCESS);
    let row = db
        .read_one(ids::MODEL_SUBSCRIPTIONS, "sub_1")
        .unwrap()
        .unwrap();
    let winner = serde_json::to_value(record("unpaid", "2027-01-01T00:00:00Z", false)).unwrap();
    s.queue_guarded_race(vec![(ids::MODEL_SUBSCRIPTIONS, "sub_1", winner.clone())]);
    assert!(!super::subscription_store::update_monotonic(
        &db,
        &row,
        record("active", "2026-08-01T00:00:00Z", false)
    )
    .unwrap());
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap(),
        winner
    );
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}
