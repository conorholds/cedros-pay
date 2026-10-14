//! Guarded receipt-claim regressions independent of provider network crypto.

use super::*;
use crate::fake::FakeSeams;

fn product(seams: &FakeSeams, id: &str, store_id: &str) {
    seams.seed(
        ids::MODEL_CATALOG,
        id,
        json!({ "id": id,
        "storeProduct": { "apple": { "productId": store_id } },
        "price": { "amountCents": 700, "currency": "usd" } }),
    );
}

fn request(product_id: &str, store_id: &str) -> VerifyReq {
    VerifyReq {
        product_id: product_id.into(),
        method: "apple_iap".into(),
        store_product_id: store_id.into(),
        transaction_id: Some("tx-guarded".into()),
        original_transaction_id: None,
        purchase_token: None,
        package_name: None,
        metadata: Map::new(),
    }
}

fn transaction(product_id: &str, bundle: &str, subscription: bool) -> AppleTx {
    AppleTx {
        transaction_id: Some("tx-guarded".into()),
        original_transaction_id: subscription.then(|| "original-guarded".into()),
        product_id: Some(product_id.into()),
        bundle_id: Some(bundle.into()),
        expires_date: subscription.then_some(1_900_000_000_000),
        revocation_date: None,
    }
}

#[test]
fn exact_replay_returns_stored_outcome_without_duplicate_effects() {
    let seams = FakeSeams::new();
    product(&seams, "pro", "store.pro");
    let first = finalize_apple(
        &seams,
        &request("pro", "store.pro"),
        Some("user-1".into()),
        Some("app.one"),
        transaction("store.pro", "app.one", false),
    )
    .unwrap();
    seams.set_now(1_900_000_000);
    let replay = finalize_apple(
        &seams,
        &request("pro", "store.pro"),
        Some("user-1".into()),
        Some("app.one"),
        transaction("store.pro", "app.one", false),
    )
    .unwrap();
    assert_eq!(replay.body, first.body);
    assert_eq!(seams.entry_count(ids::MODEL_LEDGER), 1);
    assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn provider_identity_rejects_conflicting_user_product_and_app_claims() {
    let seams = FakeSeams::new();
    product(&seams, "pro", "store.pro");
    product(&seams, "other", "store.other");
    finalize_apple(
        &seams,
        &request("pro", "store.pro"),
        Some("user-1".into()),
        Some("app.one"),
        transaction("store.pro", "app.one", false),
    )
    .unwrap();
    let user = finalize_apple(
        &seams,
        &request("pro", "store.pro"),
        Some("user-2".into()),
        Some("app.one"),
        transaction("store.pro", "app.one", false),
    )
    .unwrap_err();
    let product = finalize_apple(
        &seams,
        &request("other", "store.other"),
        Some("user-1".into()),
        Some("app.one"),
        transaction("store.other", "app.one", false),
    )
    .unwrap_err();
    let app = finalize_apple(
        &seams,
        &request("pro", "store.pro"),
        Some("user-1".into()),
        Some("app.two"),
        transaction("store.pro", "app.two", false),
    )
    .unwrap_err();
    assert_eq!((user.status, product.status, app.status), (409, 409, 409));
    assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn conflicting_subscription_projection_rolls_back_receipt_claim() {
    let seams = FakeSeams::new();
    product(&seams, "pro", "store.pro");
    seams.seed(
        ids::MODEL_SUBSCRIPTIONS,
        "original-guarded",
        json!({
        "subscriptionId": "original-guarded", "customerRef": "another-user", "priceId": "pro",
        "status": "active", "provider": "apple_app_store", "providerRef": "older-tx",
        "currentPeriodEnd": "2030-01-01T00:00:00Z", "cancelAtPeriodEnd": false,
        "createdAt": "2026-01-01T00:00:00Z", "updatedAt": "2026-01-01T00:00:00Z" }),
    );
    let error = finalize_apple(
        &seams,
        &request("pro", "store.pro"),
        Some("user-1".into()),
        Some("app.one"),
        transaction("store.pro", "app.one", true),
    )
    .unwrap_err();
    assert_eq!(error.status, 409);
    assert!(seams
        .get_entry(ids::MODEL_LEDGER, "apple-tx:tx-guarded")
        .is_none());
    assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn racing_exact_claim_repairs_winner_effects_and_conflict_has_no_loser_effects() {
    let winner = FakeSeams::new();
    product(&winner, "pro", "store.pro");
    finalize_apple(
        &winner,
        &request("pro", "store.pro"),
        Some("user-1".into()),
        Some("app.one"),
        transaction("store.pro", "app.one", false),
    )
    .unwrap();
    let winning_row = winner
        .get_entry(ids::MODEL_LEDGER, "apple-tx:tx-guarded")
        .unwrap();

    let exact = FakeSeams::new();
    product(&exact, "pro", "store.pro");
    exact.queue_guarded_race(vec![(
        ids::MODEL_LEDGER,
        "apple-tx:tx-guarded",
        winning_row.clone(),
    )]);
    assert_eq!(
        finalize_apple(
            &exact,
            &request("pro", "store.pro"),
            Some("user-1".into()),
            Some("app.one"),
            transaction("store.pro", "app.one", false),
        )
        .unwrap()
        .status,
        200
    );
    assert_eq!(exact.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(exact.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);

    let conflicting = FakeSeams::new();
    product(&conflicting, "pro", "store.pro");
    conflicting.queue_guarded_race(vec![(
        ids::MODEL_LEDGER,
        "apple-tx:tx-guarded",
        winning_row,
    )]);
    let error = finalize_apple(
        &conflicting,
        &request("pro", "store.pro"),
        Some("user-2".into()),
        Some("app.one"),
        transaction("store.pro", "app.one", false),
    )
    .unwrap_err();
    assert_eq!(error.status, 409);
    assert_eq!(conflicting.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}
