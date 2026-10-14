use super::*;
use crate::fake::FakeSeams;
use serde_json::Value;

const CART_ID: &str = "cart_00112233445566778899aabbccddeeff";

fn authed_buyer(s: &FakeSeams, user_id: &str) {
    s.set_setting("cedros_login.base_url", "https://site.example");
    s.push_http_response(200, &format!(r#"{{"user":{{"id":"{user_id}"}}}}"#));
}

fn seed_credit_account(s: &FakeSeams, subject: &str, balance_cents: i64) {
    s.seed(
        ids::MODEL_CREDITS,
        &format!("acct:{subject}"),
        json!({
            "subjectId": subject,
            "balanceCents": balance_cents,
            "heldCents": 0,
            "currency": "USD",
            "updatedAt": "2026-05-31T12:00:00Z",
        }),
    );
}

fn seed_cart(s: &FakeSeams, paid: bool, expires_at: &str, total_cents: i64) {
    let now = s.now_unix_secs();
    s.seed(
        ids::MODEL_CART,
        CART_ID,
        json!({
            "cartId": CART_ID,
            "items": [],
            "totalAtomic": 15_990_000u64,
            "totalCents": total_cents,
            "currency": "USD",
            "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "recipientTokenAccount": "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B",
            "paidSignature": if paid { Some("prior-sig") } else { None },
            "createdAt": time::iso8601(now),
            "expiresAt": expires_at,
        }),
    );
}

fn req() -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_CART_CREDITS_AUTHORIZE.into(),
        method: "POST".into(),
        path: format!("/paywall/v1/cart/{CART_ID}/credits/authorize"),
        headers: vec![("authorization".into(), "Bearer end-user".into())],
        ..Default::default()
    }
}

fn future() -> String {
    let s = FakeSeams::new();
    time::iso8601(s.now_unix_secs() + 3600)
}

#[test]
fn pays_a_cart_from_credits_and_records_settlement() {
    let s = FakeSeams::new();
    authed_buyer(&s, "user_42");
    seed_credit_account(&s, "user_42", 5000);
    seed_cart(&s, false, &future(), 1599);

    let resp = handle(&s, &req()).unwrap();
    assert_eq!(resp.status, 200);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["success"], true);
    assert_eq!(out["provider"], "credits");
    assert_eq!(out["balanceCents"], 5000 - 1599);

    // Credits debited through the one ledger.
    let acct = s.get_entry(ids::MODEL_CREDITS, "acct:user_42").unwrap();
    assert_eq!(acct["balanceCents"], 5000 - 1599);
    // Commerce-ledger row attributes the cart sale to the buyer.
    let entry = s
        .get_entry(
            ids::MODEL_LEDGER,
            "cart-credits:cart_00112233445566778899aabbccddeeff:user_42",
        )
        .unwrap();
    assert_eq!(entry["status"], "succeeded");
    assert_eq!(entry["provider"], "credits");
    assert_eq!(entry["grossCents"], 1599);
    assert_eq!(entry["productId"], format!("cart:{CART_ID}"));
    // Cart flagged paid + revenue event fired once.
    let cart = s.get_entry(ids::MODEL_CART, CART_ID).unwrap();
    assert_eq!(
        cart["paidSignature"],
        "cart-credits:cart_00112233445566778899aabbccddeeff:user_42"
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn insufficient_balance_is_402_with_no_state_change() {
    let s = FakeSeams::new();
    authed_buyer(&s, "user_42");
    seed_credit_account(&s, "user_42", 1000);
    seed_cart(&s, false, &future(), 1599);

    assert_eq!(handle(&s, &req()).unwrap_err().status, 402);
    // No debit, no ledger row, no cart-paid, no analytics.
    let acct = s.get_entry(ids::MODEL_CREDITS, "acct:user_42").unwrap();
    assert_eq!(acct["balanceCents"], 1000);
    assert!(s
        .get_entry(
            ids::MODEL_LEDGER,
            "cart-credits:cart_00112233445566778899aabbccddeeff:user_42"
        )
        .is_none());
    let cart = s.get_entry(ids::MODEL_CART, CART_ID).unwrap();
    assert_eq!(cart["paidSignature"], Value::Null);
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn already_paid_cart_is_idempotent_success_without_charging() {
    let s = FakeSeams::new();
    authed_buyer(&s, "user_42");
    seed_credit_account(&s, "user_42", 5000);
    seed_cart(&s, true, &future(), 1599);

    let out: Value = serde_json::from_str(&handle(&s, &req()).unwrap().body).unwrap();
    assert_eq!(out["success"], true);
    assert_eq!(out["signature"], "prior-sig");
    assert_eq!(out["provider"], "unknown");
    // Balance untouched, no new analytics.
    let acct = s.get_entry(ids::MODEL_CREDITS, "acct:user_42").unwrap();
    assert_eq!(acct["balanceCents"], 5000);
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn already_paid_cart_reports_the_actual_settlement_rail() {
    let s = FakeSeams::new();
    authed_buyer(&s, "user_42");
    seed_credit_account(&s, "user_42", 5000);
    seed_cart(&s, false, &future(), 1599);
    let mut cart = s.get_entry(ids::MODEL_CART, CART_ID).unwrap();
    cart["paidSignature"] = Value::String("cs_other_rail".into());
    cart["settlementClaim"] = json!({
        "schemaVersion": 1,
        "rail": "stripe",
        "fingerprint": "stripe-fingerprint",
        "reference": "cs_other_rail",
        "status": "succeeded",
    });
    s.seed(ids::MODEL_CART, CART_ID, cart);

    let out: Value = serde_json::from_str(&handle(&s, &req()).unwrap().body).unwrap();
    assert_eq!(out["provider"], "stripe");
    assert_eq!(out["signature"], "cs_other_rail");
    assert_eq!(
        s.get_entry(ids::MODEL_CREDITS, "acct:user_42").unwrap()["balanceCents"],
        5000
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn expired_cart_is_422() {
    let s = FakeSeams::new();
    authed_buyer(&s, "user_42");
    seed_credit_account(&s, "user_42", 5000);
    seed_cart(&s, false, "2020-01-01T00:00:00Z", 1599);
    assert_eq!(handle(&s, &req()).unwrap_err().status, 422);
}

#[test]
fn unauthenticated_is_401() {
    let s = FakeSeams::new();
    let req = RouteRequest {
        route_id: ids::ROUTE_CART_CREDITS_AUTHORIZE.into(),
        method: "POST".into(),
        path: format!("/paywall/v1/cart/{CART_ID}/credits/authorize"),
        ..Default::default()
    };
    assert_eq!(handle(&s, &req).unwrap_err().status, 401);
}

/// Crash-safety: the debit already committed (txn exists) but the ledger row + the
/// cart-paid flag did not (a kill landed between them). A retry must converge those
/// writes via the atomic replay WITHOUT charging the buyer again or re-counting
/// revenue.
#[test]
fn retry_after_committed_debit_converges_without_a_second_charge() {
    let s = FakeSeams::new();
    authed_buyer(&s, "user_42");
    // Account already reflects the first (committed) debit; cart still unpaid.
    seed_credit_account(&s, "user_42", 5000 - 1599);
    seed_cart(&s, false, &future(), 1599);
    let source_ref = format!("cart-credits:{CART_ID}:user_42");
    s.seed(
        ids::MODEL_CREDITS,
        &format!("txn:{source_ref}"),
        json!({
            "sourceRef": source_ref,
            "subjectId": "user_42",
            "kind": "authorize",
            "amountCents": 1599,
            "currency": "USD",
            "reason": format!("cart:{CART_ID}"),
            "balanceAfterCents": 5000 - 1599,
            "createdAt": "2026-05-31T12:00:00Z",
        }),
    );

    let out: Value = serde_json::from_str(&handle(&s, &req()).unwrap().body).unwrap();
    assert_eq!(out["success"], true);
    // No SECOND debit — balance stays at the post-first-debit value.
    let acct = s.get_entry(ids::MODEL_CREDITS, "acct:user_42").unwrap();
    assert_eq!(acct["balanceCents"], 5000 - 1599);
    // The settlement writes converged: ledger row present, cart now flagged paid.
    assert!(s.get_entry(ids::MODEL_LEDGER, &source_ref).is_some());
    let cart = s.get_entry(ids::MODEL_CART, CART_ID).unwrap();
    assert_eq!(cart["paidSignature"], source_ref);
    // The missing durable effects are recovered exactly once without a second debit.
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn transaction_only_race_converges_cart_and_ledger_without_effects() {
    let s = FakeSeams::new();
    authed_buyer(&s, "user_42");
    seed_credit_account(&s, "user_42", 5000);
    seed_cart(&s, false, &future(), 1599);
    let source_ref = format!("cart-credits:{CART_ID}:user_42");
    let account_key = "acct:user_42";
    let txn_key = format!("txn:{source_ref}");
    s.queue_guarded_race(vec![
        (
            ids::MODEL_CREDITS,
            account_key,
            json!({
                "subjectId": "user_42", "balanceCents": 5000 - 1599,
                "heldCents": 0, "currency": "USD",
                "updatedAt": "2026-05-31T12:00:00Z",
            }),
        ),
        (
            ids::MODEL_CREDITS,
            &txn_key,
            json!({
                "sourceRef": source_ref, "subjectId": "user_42",
                "kind": "authorize", "amountCents": 1599, "currency": "USD",
                "reason": format!("cart:{CART_ID}"),
                "balanceAfterCents": 5000 - 1599,
                "createdAt": "2026-05-31T12:00:00Z",
            }),
        ),
    ]);

    let out: Value = serde_json::from_str(&handle(&s, &req()).unwrap().body).unwrap();
    assert_eq!(out["success"], true);
    assert_eq!(out["balanceCents"], 5000 - 1599);
    assert_eq!(
        s.get_entry(ids::MODEL_CREDITS, account_key).unwrap()["balanceCents"],
        5000 - 1599
    );
    assert!(s.get_entry(ids::MODEL_LEDGER, &source_ref).is_some());
    assert_eq!(
        s.get_entry(ids::MODEL_CART, CART_ID).unwrap()["paidSignature"],
        source_ref
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn rejects_late_coupon_not_in_stored_snapshot() {
    let s = FakeSeams::new();
    authed_buyer(&s, "user_42");
    seed_credit_account(&s, "user_42", 5000);
    seed_cart(&s, false, &future(), 1599);

    let mut request = req();
    request.body = json!({ "couponCode": "LATE10" }).to_string();
    let err = handle(&s, &request).unwrap_err();
    assert_eq!(err.status, 422);
    assert_eq!(err.code, "coupon_not_applicable");
    // Nothing was charged.
    let acct = s.get_entry(ids::MODEL_CREDITS, "acct:user_42").unwrap();
    assert_eq!(acct["balanceCents"], 5000);
}

#[test]
fn accepts_checkout_coupon_matching_stored_snapshot() {
    let s = FakeSeams::new();
    authed_buyer(&s, "user_42");
    seed_credit_account(&s, "user_42", 5000);
    // A quote-time coupon is frozen in the snapshot; credits charges the
    // discounted total when checkout re-sends the same code.
    s.seed(
        ids::MODEL_CART,
        CART_ID,
        json!({
            "cartId": CART_ID,
            "items": [],
            "totalAtomic": 12_792_000u64,
            "totalCents": 1279,
            "currency": "USD",
            "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "recipientTokenAccount": "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B",
            "paidSignature": null,
            "createdAt": time::iso8601(s.now_unix_secs()),
            "expiresAt": future(),
            "appliedCoupon": {
                "code": "SAVE20",
                "discountType": "percentage",
                "discountBps": 2000,
                "originalTotalCents": 1599,
                "discountedTotalCents": 1279
            }
        }),
    );

    let mut request = req();
    request.body = json!({ "couponCode": " save20 " }).to_string();
    let resp = handle(&s, &request).unwrap();
    assert_eq!(resp.status, 200);
    let acct = s.get_entry(ids::MODEL_CREDITS, "acct:user_42").unwrap();
    assert_eq!(acct["balanceCents"], 5000 - 1279);
}
