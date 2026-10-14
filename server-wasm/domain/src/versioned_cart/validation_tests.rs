use super::*;

#[test]
fn malformed_and_oversized_inputs_fail_before_storage() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    for command in [
        add_command(&generation, " bad", 0, "op-a", "sku", 1, 100),
        add_command(&generation, "lane", 0, "op-a", "bad product", 1, 100),
        add_command(&generation, "lane", 0, "op-a", "sku", 0, 100),
        add_command(&generation, "lane", 0, &"x".repeat(129), "sku", 1, 100),
        add_command(
            &generation,
            "lane",
            validation::MAX_CART_VERSION + 1,
            "op-version",
            "sku",
            1,
            100,
        ),
    ] {
        assert_eq!(service.apply(&command).unwrap_err().status, 422);
    }
    assert_eq!(service.read("lane").unwrap().version, 0);
}

#[test]
fn arithmetic_overflow_fails_without_cart_or_operation() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    let command = add_command(&generation, "lane", 0, "op-overflow", "sku", 2, u64::MAX);
    assert_eq!(service.apply(&command).unwrap_err().status, 422);
    let keys = keys(&service, &command);
    assert!(seams.get_entry(CART_MODEL_ID, &keys.cart).is_none());
    assert!(seams
        .get_entry(OPERATION_MODEL_ID, &keys.operation)
        .is_none());
}

#[test]
fn line_count_is_bounded() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    for index in 0..validation::MAX_LINES {
        let command = add_command(
            &generation,
            "lane",
            index as u64,
            &format!("op-{index}"),
            &format!("sku-{index}"),
            1,
            1,
        );
        applied(service.apply(&command).unwrap());
    }
    let extra = add_command(
        &generation,
        "lane",
        validation::MAX_LINES as u64,
        "op-extra",
        "sku-extra",
        1,
        1,
    );
    assert_eq!(service.apply(&extra).unwrap_err().status, 422);
    assert_eq!(
        service.read("lane").unwrap().lines.len(),
        validation::MAX_LINES
    );
}

#[test]
fn public_version_overflow_is_rejected_without_operation_record() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    let initial = add_command(&generation, "lane", 0, "op-initial", "sku-a", 1, 100);
    applied(service.apply(&initial).unwrap());
    let overflow = add_command(
        &generation,
        "lane",
        validation::MAX_CART_VERSION,
        "op-version-overflow",
        "sku-b",
        1,
        100,
    );
    let keys = keys(&service, &overflow);
    let mut cart = seams.get_entry(CART_MODEL_ID, &keys.cart).unwrap();
    cart["version"] = serde_json::Value::from(validation::MAX_CART_VERSION);
    seams.seed(CART_MODEL_ID, &keys.cart, cart);

    assert_eq!(service.apply(&overflow).unwrap_err().status, 422);
    assert!(seams
        .get_entry(OPERATION_MODEL_ID, &keys.operation)
        .is_none());
}

#[test]
fn generation_epoch_overflow_preserves_the_current_generation() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    service.open_generation().unwrap();
    let key = generation_key(&service);
    let mut record = seams.get_entry(GENERATION_MODEL_ID, &key).unwrap();
    record["epoch"] = serde_json::Value::from(validation::MAX_GENERATION_EPOCH);
    seams.seed(GENERATION_MODEL_ID, &key, record);
    let current = service.current_generation().unwrap().unwrap();

    assert_eq!(
        service
            .rotate_generation(&current.generation)
            .unwrap_err()
            .status,
        422
    );
    assert_eq!(service.current_generation().unwrap(), Some(current));
}

#[test]
fn mixed_currency_fails_without_cart_or_operation_change() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    let first = add_command(&generation, "lane", 0, "op-usd", "sku-usd", 1, 100);
    let committed = applied(service.apply(&first).unwrap());
    let mut mixed = add_command(&generation, "lane", 1, "op-eur", "sku-eur", 1, 200);
    let CartMutation::Add { item } = &mut mixed.mutation else {
        unreachable!();
    };
    item.currency = "EUR".to_string();
    let keys = keys(&service, &mixed);

    assert_eq!(service.apply(&mixed).unwrap_err().status, 422);
    assert_eq!(service.read("lane").unwrap(), committed);
    assert!(seams
        .get_entry(OPERATION_MODEL_ID, &keys.operation)
        .is_none());
}

#[test]
fn unknown_request_fields_fail_closed() {
    let top_level = serde_json::from_value::<CartCommand>(serde_json::json!({
        "lane": "default",
        "generation": "opaque",
        "expectedVersion": 0,
        "operationId": "op-1",
        "mutation": { "kind": "clear" },
        "customerTag": "caller-controlled"
    }));
    assert!(top_level.is_err());

    let nested = serde_json::from_value::<CartCommand>(serde_json::json!({
        "lane": "default",
        "generation": "opaque",
        "expectedVersion": 0,
        "operationId": "op-1",
        "mutation": { "kind": "clear", "customerGeneration": 7 }
    }));
    assert!(nested.is_err());
}
