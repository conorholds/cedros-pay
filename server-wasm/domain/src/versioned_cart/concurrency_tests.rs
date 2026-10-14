use super::*;

#[test]
fn same_version_writers_have_one_winner_and_authoritative_conflict() {
    let seams = FakeSeams::new();
    let first = service(&seams, "buyer-a", provider_a());
    let second = service(&seams, "buyer-a", provider_a());
    let generation = first.open_generation().unwrap();
    let winner = add_command(&generation, "lane", 0, "op-a", "sku-a", 1, 100);
    let loser = add_command(&generation, "lane", 0, "op-b", "sku-b", 1, 200);
    let committed = applied(first.apply(&winner).unwrap());
    assert!(matches!(
        second.apply(&loser).unwrap(),
        ApplyOutcome::Conflict { authoritative }
            if authoritative == committed && authoritative.lines[0].product_id == "sku-a"
    ));
}

#[test]
fn delayed_old_write_never_overwrites_newer_state() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    let delayed = add_command(&generation, "lane", 0, "op-old", "sku-old", 1, 100);
    let newer = add_command(&generation, "lane", 0, "op-new", "sku-new", 1, 200);
    let committed = applied(service.apply(&newer).unwrap());
    assert!(matches!(
        service.apply(&delayed).unwrap(),
        ApplyOutcome::Conflict { authoritative } if authoritative == committed
    ));
    assert_eq!(service.read("lane").unwrap(), committed);
}

#[test]
fn stale_generation_cannot_mutate_cart_or_create_operation() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let old = service.open_generation().unwrap();
    let current = match service.rotate_generation(&old.generation).unwrap() {
        RotateGenerationOutcome::Rotated { generation } => generation,
        other => panic!("expected rotated generation, got {other:?}"),
    };
    let command = add_command(&old, "lane", 0, "op-stale", "sku-a", 1, 100);
    assert!(matches!(
        service.apply(&command).unwrap(),
        ApplyOutcome::StaleGeneration {
            current_generation,
            authoritative,
        } if current_generation == current && authoritative.version == 0
    ));
    let keys = keys(&service, &command);
    assert!(seams
        .get_entry(OPERATION_MODEL_ID, &keys.operation)
        .is_none());
    assert!(seams
        .get_entry(TOMBSTONE_MODEL_ID, &keys.operation)
        .is_none());
    assert_eq!(service.read("lane").unwrap().version, 0);
}

#[test]
fn subject_lane_and_provider_scopes_are_isolated() {
    let seams = FakeSeams::new();
    let a = service(&seams, "buyer-a", provider_a());
    let b = service(&seams, "buyer-b", provider_a());
    let p = service(&seams, "buyer-a", provider_b());
    let ga = a.open_generation().unwrap();
    let gb = b.open_generation().unwrap();
    let gp = p.open_generation().unwrap();
    applied(
        a.apply(&add_command(&ga, "lane-a", 0, "same-op", "sku-a", 1, 100))
            .unwrap(),
    );
    applied(
        a.apply(&add_command(&ga, "lane-b", 0, "same-op", "sku-b", 1, 200))
            .unwrap(),
    );
    applied(
        b.apply(&add_command(&gb, "lane-a", 0, "same-op", "sku-c", 1, 300))
            .unwrap(),
    );
    applied(
        p.apply(&add_command(&gp, "lane-a", 0, "same-op", "sku-d", 1, 400))
            .unwrap(),
    );

    assert_eq!(a.read("lane-a").unwrap().subtotal_cents, 100);
    assert_eq!(a.read("lane-b").unwrap().subtotal_cents, 200);
    assert_eq!(b.read("lane-a").unwrap().subtotal_cents, 300);
    assert_eq!(p.read("lane-a").unwrap().subtotal_cents, 400);
}

#[test]
fn guarded_conflict_rolls_back_the_operation_record() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    let initial = add_command(&generation, "lane", 0, "op-initial", "sku-a", 1, 100);
    applied(service.apply(&initial).unwrap());
    let losing = add_command(&generation, "lane", 1, "op-losing", "sku-b", 1, 200);
    let keys = keys(&service, &losing);
    let mut winner = seams.get_entry(CART_MODEL_ID, &keys.cart).unwrap();
    winner["version"] = serde_json::Value::from(2u64);
    seams.queue_guarded_race(vec![(CART_MODEL_ID, &keys.cart, winner)]);

    assert!(matches!(
        service.apply(&losing).unwrap(),
        ApplyOutcome::Conflict { authoritative } if authoritative.version == 2
    ));
    assert!(seams
        .get_entry(OPERATION_MODEL_ID, &keys.operation)
        .is_none());
    assert!(seams
        .get_entry(TOMBSTONE_MODEL_ID, &keys.operation)
        .is_none());
}

#[test]
fn precondition_race_rechecks_the_operation_and_replays_exact_winner() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    let command = add_command(&generation, "lane", 0, "op-raced", "sku-a", 1, 100);
    let keys = keys(&service, &command);
    let fingerprint = identity::fingerprint(&service.scope_hash, &command).unwrap();
    let winner = mutation::apply(
        None,
        &service.scope_hash,
        &keys.lane_hash,
        generation.epoch,
        &command.mutation,
        seams.now_unix_secs(),
    )
    .unwrap();
    let operation = storage::MutationRecord {
        schema_version: 1,
        scope_hash: service.scope_hash.clone(),
        lane_hash: keys.lane_hash.clone(),
        operation_hash: keys.operation_hash.clone(),
        fingerprint: fingerprint.clone(),
        result_version: winner.version,
        created_at: crate::time::iso8601(seams.now_unix_secs()),
    };
    let tombstone = storage::OperationTombstone {
        schema_version: 1,
        scope_hash: service.scope_hash.clone(),
        lane_hash: keys.lane_hash.clone(),
        operation_hash: keys.operation_hash.clone(),
        fingerprint,
        created_at: crate::time::iso8601(seams.now_unix_secs()),
    };
    seams.seed(
        CART_MODEL_ID,
        &keys.cart,
        serde_json::to_value(winner).unwrap(),
    );
    seams.queue_read_race_writes(
        3,
        vec![
            (
                OPERATION_MODEL_ID,
                keys.operation.as_str(),
                serde_json::to_value(operation).unwrap(),
            ),
            (
                TOMBSTONE_MODEL_ID,
                keys.operation.as_str(),
                serde_json::to_value(tombstone).unwrap(),
            ),
        ],
    );

    assert!(matches!(
        service.apply(&command).unwrap(),
        ApplyOutcome::Replayed { version: 1, .. }
    ));
}
