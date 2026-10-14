use serde_json::json;

use super::super::*;
use crate::models::LedgerEntry;
use crate::seams::HostSeams;

#[test]
fn terminal_and_unexpired_holds_do_not_starve_paid_pending_work() {
    let seams = inventory_lifecycle_tests::setup_tracked(10);
    let (operation_id, provider_id) = pending_stripe_checkout(&seams, "budget");
    let base = seams.now_unix_secs();
    let pending_deadline = pending_expiry(&seams, &operation_id);
    for index in 0..8 {
        seams.set_now(base + index + 1);
        let status = if index % 2 == 0 {
            inventory_types::HoldStatus::Committed
        } else {
            inventory_types::HoldStatus::Released
        };
        seed_hold(&seams, &format!("terminal-{index}"), status, 0, index);
        seed_hold(
            &seams,
            &format!("unexpired-{index}"),
            inventory_types::HoldStatus::Active,
            pending_deadline + 1_000,
            index,
        );
    }
    seams.set_now(pending_deadline + 1);
    seed_paid_ledger(&seams, &provider_id);

    let report = reconcile_settlements(&seams, 1).unwrap();

    assert_eq!(
        (
            report.scanned,
            report.committed,
            report.released,
            report.deferred
        ),
        (1, 1, 0, 0)
    );
    assert!(matches!(
        api_tests::facade(&seams).status(&operation_id).unwrap(),
        CanonicalPaymentOutcome::Paid { .. }
    ));
}

#[test]
fn per_state_budget_advances_pending_and_expired_under_competing_load() {
    let seams = inventory_lifecycle_tests::setup_tracked(10);
    let (operation_id, _) = pending_stripe_checkout(&seams, "deferred");
    let now = pending_expiry(&seams, &operation_id) + 1;
    seams.set_now(now);
    for index in 0..4 {
        seed_hold(
            &seams,
            &format!("expired-{index}"),
            inventory_types::HoldStatus::Active,
            now - 1_000 + index,
            index,
        );
    }

    let report = reconcile_settlements(&seams, 1).unwrap();

    assert_eq!(
        (report.scanned, report.released, report.deferred),
        (2, 1, 1)
    );
}

fn pending_expiry(seams: &crate::fake::FakeSeams, operation_id: &str) -> i64 {
    let key = super::identity::operation_entry_key(operation_id).unwrap();
    seams.get_entry(OPERATION_MODEL, &key).unwrap()["canonicalContext"]["stripe_request"]
        ["expiresAt"]
        .as_i64()
        .unwrap()
}

#[test]
fn expiry_query_is_strict_at_the_deadline_and_bounded() {
    let seams = api_tests::setup();
    seams.set_now(1_000);
    let expired_key = seed_hold(
        &seams,
        "expired",
        inventory_types::HoldStatus::Active,
        999,
        1,
    );
    let boundary_key = seed_hold(
        &seams,
        "boundary",
        inventory_types::HoldStatus::Active,
        1_000,
        2,
    );

    let report = reconcile_settlements(&seams, 1).unwrap();

    assert_eq!((report.scanned, report.released), (1, 1));
    assert_eq!(
        seams.get_entry(INVENTORY_HOLD_MODEL, &expired_key).unwrap()["status"],
        "released"
    );
    assert_eq!(
        seams
            .get_entry(INVENTORY_HOLD_MODEL, &boundary_key)
            .unwrap()["status"],
        "active"
    );
}

#[test]
fn malformed_terminal_is_ignored_but_malformed_candidate_fails_closed() {
    let seams = api_tests::setup();
    seams.set_now(1_000);
    seams.seed(
        INVENTORY_HOLD_MODEL,
        "malformed-terminal",
        json!({ "status": "committed", "expiresAt": 0, "updatedAt": 0 }),
    );
    assert_eq!(reconcile_settlements(&seams, 10).unwrap().scanned, 0);

    seams.seed(
        INVENTORY_HOLD_MODEL,
        "malformed-active",
        json!({ "status": "active", "expiresAt": 0, "updatedAt": 0 }),
    );
    let error = reconcile_settlements(&seams, 10).unwrap_err();
    assert_eq!((error.status, error.code), (500, "internal_error"));
}

fn pending_stripe_checkout(seams: &crate::fake::FakeSeams, id: &str) -> (String, String) {
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    let quote = api_tests::facade(seams)
        .quote(
            &format!("{id}-quote"),
            &api_tests::quote_body(&format!("{id}-quote"), json!(["stripe"])),
        )
        .unwrap();
    let provider_id = format!("cs_{id}_paid");
    seams.push_http_response(
        200,
        &json!({
            "id": provider_id,
            "url": format!("https://checkout.stripe.com/{id}")
        })
        .to_string(),
    );
    let outcome = api_tests::facade(seams)
        .checkout(
            &format!("{id}-checkout"),
            &api_tests::checkout_body(&format!("{id}-checkout"), &quote.operation_id, "stripe"),
        )
        .unwrap();
    let CanonicalPaymentOutcome::ActionRequired { operation_id, .. } = outcome else {
        panic!("expected Stripe action-required outcome")
    };
    (operation_id, provider_id)
}

fn seed_paid_ledger(seams: &crate::fake::FakeSeams, provider_id: &str) {
    seams.seed(
        crate::ids::MODEL_LEDGER,
        provider_id,
        serde_json::to_value(LedgerEntry {
            reference: provider_id.into(),
            kind: "payment".into(),
            status: "succeeded".into(),
            gross_cents: 1_500,
            currency: "USD".into(),
            provider: "stripe".into(),
            provider_ref: Some(provider_id.into()),
            ..Default::default()
        })
        .unwrap(),
    );
}

fn seed_hold(
    seams: &crate::fake::FakeSeams,
    quote_id: &str,
    status: inventory_types::HoldStatus,
    expires_at: i64,
    updated_at: i64,
) -> String {
    let scope = "scope:test";
    let key = inventory_types::hold_key(scope, quote_id);
    seams.seed(
        INVENTORY_HOLD_MODEL,
        &key,
        serde_json::to_value(inventory_types::HoldRecord {
            schema_version: 1,
            provider_scope: scope.into(),
            quote_operation_id: quote_id.into(),
            checkout_operation_id: None,
            status,
            lines: Vec::new(),
            expires_at,
            updated_at,
        })
        .unwrap(),
    );
    key
}

#[test]
fn unresolved_old_checkout_cannot_starve_later_paid_checkout_after_restart() {
    let seams = api_tests::setup();
    let (_, first) = pending_stripe_checkout(&seams, "first");
    seams.set_now(seams.now_unix_secs() + 1);
    let (operation, second) = pending_stripe_checkout(&seams, "second");
    seed_paid_ledger(&seams, &second);
    assert_eq!(reconcile_settlements(&seams, 1).unwrap().deferred, 1);
    // Each call reloads durable progress, as a fresh guest invocation does.
    assert_eq!(reconcile_settlements(&seams, 1).unwrap().committed, 1);
    assert!(matches!(
        api_tests::facade(&seams).status(&operation).unwrap(),
        CanonicalPaymentOutcome::Paid { .. }
    ));
    assert!(seams.get_entry(crate::ids::MODEL_LEDGER, &first).is_none());
}

#[test]
fn slow_provider_stops_new_work_and_next_run_resumes_at_unstarted_checkout() {
    let seams = api_tests::setup();
    pending_stripe_checkout(&seams, "slow");
    seams.set_now(seams.now_unix_secs() + 1);
    let (_, second) = pending_stripe_checkout(&seams, "after-slow");
    seed_paid_ledger(&seams, &second);
    seams.push_http_time_advance(41);
    let first = reconcile_settlements(&seams, 100).unwrap();
    assert_eq!((first.scanned, first.deferred), (1, 1));
    assert_eq!(reconcile_settlements(&seams, 100).unwrap().committed, 1);
}
