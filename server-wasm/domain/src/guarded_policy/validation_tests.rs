use super::*;

#[test]
fn missing_marker_fails_before_provider_or_mutation_effects() {
    let seams = FakeSeams::new();
    assert_unavailable(gated_consumer(&seams).unwrap_err());
    assert!(seams.provider_requests.borrow().is_empty());
    assert_eq!(seams.entry_count(ids::MODEL_LEDGER), 0);
}

#[test]
fn malformed_missing_extra_reordered_and_stale_markers_fail_closed() {
    let fixtures = [
        malformed(),
        missing_field(),
        extra_field(),
        reordered_models(),
        stale_contract(),
    ];
    for fixture in fixtures {
        let seams = FakeSeams::new();
        seams.seed(CONTROL_MODEL, MARKER_KEY, fixture);
        assert_unavailable(require_active(&seams).unwrap_err());
        assert!(seams.provider_requests.borrow().is_empty());
    }
}

fn gated_consumer(seams: &FakeSeams) -> crate::error::AppResult<()> {
    require_active(seams)?;
    seams.provider_execute("test", "payments", "mutate", "{}")?;
    Db::new(seams, ids::DB_ACCESS).write(ids::MODEL_LEDGER, "unsafe", &json!({}))?;
    Ok(())
}

fn malformed() -> Value {
    json!({ "schemaVersion": 1 })
}

fn missing_field() -> Value {
    let seams = FakeSeams::new();
    let mut value = marker_value(&seams);
    value.as_object_mut().unwrap().remove("active");
    value
}

fn extra_field() -> Value {
    let seams = FakeSeams::new();
    let mut value = marker_value(&seams);
    value["unexpected"] = json!(true);
    value
}

fn reordered_models() -> Value {
    let seams = FakeSeams::new();
    let mut value = marker_value(&seams);
    value["models"].as_array_mut().unwrap().swap(0, 1);
    value
}

fn stale_contract() -> Value {
    let seams = FakeSeams::new();
    let mut value = marker_value(&seams);
    value["hostCommit"] = json!("ebc8a7dbb");
    value
}
