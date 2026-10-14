//! Companion reconciliation regressions for exact credit-transaction races.

use super::*;
use crate::db::Db;
use crate::guarded_batch::GuardedCondition;

const COMPANION_KEY: &str = "ledger:g1";

fn credit_move() -> CreditMove<'static> {
    CreditMove {
        subject_id: "u1",
        amount_cents: 500,
        currency: Some("USD"),
        kind: "grant",
        delta: 500,
        source_ref: "g1",
        reason: None,
    }
}

fn companion(status: &str) -> serde_json::Value {
    json!({ "kind": "payment", "status": status })
}

fn companion_op(status: &str) -> BatchOp {
    BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: COMPANION_KEY.into(),
        data: companion(status),
    }
}

fn companion_guard() -> GuardedCondition {
    GuardedCondition::Absent {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: COMPANION_KEY.into(),
    }
}

fn queue_exact_transaction_race(
    seams: &FakeSeams,
    mut writes: Vec<(&str, &str, serde_json::Value)>,
) {
    writes.splice(
        0..0,
        [
            (ids::MODEL_CREDITS, "acct:u1", account(500, 0)),
            (ids::MODEL_CREDITS, "txn:g1", txn("g1", "grant", 500, 500)),
        ],
    );
    seams.queue_guarded_race(writes);
}

#[test]
fn transaction_only_winner_converges_missing_companion_in_call() {
    let seams = seams();
    queue_exact_transaction_race(&seams, vec![]);
    let outcome = moves_api::apply_guarded_credit_move(
        &seams,
        &credit_move(),
        &[companion_guard()],
        &[companion_op("succeeded")],
    )
    .unwrap();

    assert!(!outcome.applied);
    assert_eq!(stored_account(&seams)["balanceCents"], 500);
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, COMPANION_KEY).unwrap(),
        companion("succeeded")
    );
}

#[test]
fn identical_full_winner_is_idempotent_without_second_balance_move() {
    let seams = seams();
    queue_exact_transaction_race(
        &seams,
        vec![(
            ids::MODEL_LEDGER,
            COMPANION_KEY,
            json!({ "status": "succeeded", "kind": "payment" }),
        )],
    );
    let outcome = moves_api::apply_guarded_credit_move(
        &seams,
        &credit_move(),
        &[companion_guard()],
        &[companion_op("succeeded")],
    )
    .unwrap();

    assert!(!outcome.applied);
    assert_eq!(stored_account(&seams)["balanceCents"], 500);
}

#[test]
fn differing_companion_data_conflicts_without_overwrite() {
    let seams = seams();
    queue_exact_transaction_race(
        &seams,
        vec![(ids::MODEL_LEDGER, COMPANION_KEY, companion("failed"))],
    );
    let error = moves_api::apply_guarded_credit_move(
        &seams,
        &credit_move(),
        &[companion_guard()],
        &[companion_op("succeeded")],
    )
    .unwrap_err();

    assert_eq!((error.status, error.code), (409, "conflict"));
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, COMPANION_KEY).unwrap(),
        companion("failed")
    );
    assert_eq!(stored_account(&seams)["balanceCents"], 500);
}

#[test]
fn stale_companion_race_rolls_back_every_missing_write() {
    let seams = seams();
    seams.seed(ids::MODEL_CART, "cart:g1", json!({ "status": "open" }));
    let cart = Db::new(&seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CART, "cart:g1")
        .unwrap()
        .unwrap();
    let conditions = [
        companion_guard(),
        GuardedCondition::Version {
            content_model_id: ids::MODEL_CART,
            entry_key: "cart:g1".into(),
            expected_version: cart.version.unwrap(),
        },
    ];
    let ops = [
        companion_op("succeeded"),
        BatchOp::Write {
            content_model_id: ids::MODEL_CART,
            entry_key: "cart:g1".into(),
            data: json!({ "status": "paid" }),
        },
    ];
    queue_exact_transaction_race(&seams, vec![]);
    seams.queue_guarded_race(vec![(
        ids::MODEL_CART,
        "cart:g1",
        json!({ "status": "winner" }),
    )]);

    let error = moves_api::apply_guarded_credit_move(&seams, &credit_move(), &conditions, &ops)
        .unwrap_err();
    assert_eq!((error.status, error.code), (409, "conflict"));
    assert!(seams.get_entry(ids::MODEL_LEDGER, COMPANION_KEY).is_none());
    assert_eq!(
        seams.get_entry(ids::MODEL_CART, "cart:g1").unwrap()["status"],
        "winner"
    );
    assert_eq!(stored_account(&seams)["balanceCents"], 500);
}
