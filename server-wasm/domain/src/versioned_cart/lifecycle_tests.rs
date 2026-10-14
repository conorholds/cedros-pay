use super::*;

#[test]
fn initial_generation_is_host_issued_and_recovers_across_instances() {
    let seams = FakeSeams::new();
    let first = service(&seams, "buyer-a", provider_a());
    let opened = first.open_generation().unwrap();
    assert_eq!(opened.epoch, 1);
    assert!(!opened.generation.is_empty());

    let fresh = service(&seams, "buyer-a", provider_a());
    assert_eq!(fresh.open_generation().unwrap(), opened);
    assert_eq!(fresh.current_generation().unwrap(), Some(opened));
}

#[test]
fn rotation_uses_the_host_revision_and_rejects_stale_rotation() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let first = service.open_generation().unwrap();
    let second = match service.rotate_generation(&first.generation).unwrap() {
        RotateGenerationOutcome::Rotated { generation } => generation,
        other => panic!("expected rotation, got {other:?}"),
    };
    assert_eq!(second.epoch, 2);
    assert_ne!(second.generation, first.generation);
    assert_eq!(
        service.rotate_generation(&first.generation).unwrap(),
        RotateGenerationOutcome::StaleGeneration { current: second }
    );
}

#[test]
fn apply_and_exact_replay_do_not_double_quantity_or_totals() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    let command = add_command(&generation, "default", 0, "op-add", "sku-a", 2, 500);
    let first = applied(service.apply(&command).unwrap());
    assert_eq!(
        (first.version, first.total_quantity, first.subtotal_cents),
        (1, 2, 1000)
    );

    let replay = service.apply(&command).unwrap();
    assert!(matches!(
        replay,
        ApplyOutcome::Replayed {
            version: 1,
            ref authoritative,
        } if authoritative.total_quantity == 2 && authoritative.subtotal_cents == 1000
    ));
    assert_eq!(service.read("default").unwrap(), first);
}

#[test]
fn same_operation_with_different_material_conflicts() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    let first = add_command(&generation, "default", 0, "op-same", "sku-a", 1, 500);
    applied(service.apply(&first).unwrap());
    let changed = add_command(&generation, "default", 0, "op-same", "sku-a", 2, 500);
    assert!(matches!(
        service.apply(&changed).unwrap(),
        ApplyOutcome::IdempotencyConflict { authoritative }
            if authoritative.version == 1 && authoritative.total_quantity == 1
    ));
}

#[test]
fn fresh_service_replays_a_durable_operation() {
    let seams = FakeSeams::new();
    let first = service(&seams, "buyer-a", provider_a());
    let generation = first.open_generation().unwrap();
    let command = add_command(&generation, "default", 0, "op-fresh", "sku-a", 1, 250);
    applied(first.apply(&command).unwrap());
    drop(first);

    let fresh = service(&seams, "buyer-a", provider_a());
    assert!(matches!(
        fresh.apply(&command).unwrap(),
        ApplyOutcome::Replayed { version: 1, .. }
    ));
}

#[test]
fn replay_keeps_its_recorded_version_after_authoritative_state_advances() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    let first = add_command(&generation, DEFAULT_LANE, 0, "op-first", "sku-a", 1, 250);
    let first_state = applied(service.apply(&first).unwrap());
    let second = add_command(&generation, DEFAULT_LANE, 1, "op-second", "sku-b", 1, 500);
    let second_state = applied(service.apply(&second).unwrap());
    assert_eq!(second_state.version, first_state.version + 1);

    assert!(matches!(
        service.apply(&first).unwrap(),
        ApplyOutcome::Replayed { version: 1, authoritative }
            if authoritative.version == 2 && authoritative.subtotal_cents == 750
    ));
}

#[test]
fn exact_replay_precedes_a_later_generation_rotation() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    let command = add_command(
        &generation,
        "default",
        0,
        "op-before-rotate",
        "sku-a",
        1,
        250,
    );
    applied(service.apply(&command).unwrap());
    let _ = service.rotate_generation(&generation.generation).unwrap();
    assert!(matches!(
        service.apply(&command).unwrap(),
        ApplyOutcome::Replayed { version: 1, .. }
    ));
}
