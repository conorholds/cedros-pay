use super::*;

#[test]
fn every_enrolled_model_blocks_plain_and_allows_guarded_write_delete() {
    let seams = FakeSeams::new();
    enroll(&seams).unwrap();
    let db = Db::new(&seams, ids::DB_ACCESS);
    for model in GUARDED_MODELS {
        assert!(db.write(model, "plain", &json!({})).is_err(), "{model}");
        let write = db
            .guarded_batch(
                &[GuardedCondition::Absent {
                    content_model_id: model,
                    entry_key: "guarded".into(),
                }],
                &[BatchOp::Write {
                    content_model_id: model,
                    entry_key: "guarded".into(),
                    data: json!({ "ok": true }),
                }],
            )
            .unwrap();
        assert!(
            matches!(write, GuardedBatchOutcome::Applied { .. }),
            "{model}"
        );
        assert!(db.delete(model, "guarded").is_err(), "{model}");
        let version = db
            .read_one(model, "guarded")
            .unwrap()
            .unwrap()
            .version
            .unwrap();
        let delete = db
            .guarded_batch(
                &[GuardedCondition::Version {
                    content_model_id: model,
                    entry_key: "guarded".into(),
                    expected_version: version,
                }],
                &[BatchOp::Delete {
                    content_model_id: model,
                    entry_key: "guarded".into(),
                }],
            )
            .unwrap();
        assert!(
            matches!(delete, GuardedBatchOutcome::Applied { .. }),
            "{model}"
        );
    }
}

#[test]
fn control_model_remains_open_after_enrollment() {
    let seams = FakeSeams::new();
    enroll(&seams).unwrap();
    let db = Db::new(&seams, ids::DB_ACCESS);
    db.write(CONTROL_MODEL, "probe", &json!({ "open": true }))
        .unwrap();
    assert!(db.delete(CONTROL_MODEL, "probe").unwrap());
    assert!(require_active(&seams).is_ok());
}
