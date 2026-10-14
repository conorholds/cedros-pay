use super::*;
use crate::db::Db;
use crate::seams::HostSeams;

use super::settlement_effect_test_support::{effect_id, settle_credits, setup_credits};

#[test]
fn expired_lease_can_be_recovered_and_fences_the_old_worker() {
    let seams = setup_credits();
    let operation_id = settle_credits(&seams, "lease");
    let effect_id = effect_id(&seams, &operation_id);
    let db = Db::new(&seams, crate::ids::DB_ACCESS);
    let row = db
        .read_one(crate::ids::MODEL_WEBHOOK_OUTBOX, &effect_id)
        .unwrap()
        .unwrap();
    let old_owner = OperationOwner::random().unwrap();
    let mut old_claim = settlement_effect_state::claim(&db, row, &old_owner, seams.now_unix_secs())
        .unwrap()
        .unwrap();
    assert_eq!(deliver_settlement_effects(&seams, 20).unwrap().scanned, 0);

    seams.set_now(seams.now_unix_secs() + settlement_effect_state::LEASE_SECONDS + 1);
    assert_eq!(deliver_settlement_effects(&seams, 20).unwrap().delivered, 1);
    let target_id = old_claim.record.targets[0].id.clone();
    assert!(!settlement_effect_state::target_delivered(
        &db,
        &mut old_claim,
        &old_owner,
        &target_id,
        seams.now_unix_secs(),
    )
    .unwrap());
}

#[test]
fn oldest_due_work_wins_across_pending_and_expired_lease_queues() {
    let seams = setup_credits();
    let first_operation = settle_credits(&seams, "old-lease");
    let first_effect = effect_id(&seams, &first_operation);
    let db = Db::new(&seams, crate::ids::DB_ACCESS);
    let first_row = db
        .read_one(crate::ids::MODEL_WEBHOOK_OUTBOX, &first_effect)
        .unwrap()
        .unwrap();
    settlement_effect_state::claim(
        &db,
        first_row,
        &OperationOwner::random().unwrap(),
        seams.now_unix_secs(),
    )
    .unwrap()
    .unwrap();
    seams.set_now(seams.now_unix_secs() + settlement_effect_state::LEASE_SECONDS + 10);
    let second_operation = settle_credits(&seams, "new-pending");
    let second_effect = effect_id(&seams, &second_operation);

    assert_eq!(deliver_settlement_effects(&seams, 1).unwrap().delivered, 1);
    assert_eq!(
        seams
            .get_entry(crate::ids::MODEL_WEBHOOK_OUTBOX, &first_effect)
            .unwrap()["status"],
        "effect_delivered"
    );
    assert_eq!(
        seams
            .get_entry(crate::ids::MODEL_WEBHOOK_OUTBOX, &second_effect)
            .unwrap()["status"],
        "effect_pending"
    );
}
