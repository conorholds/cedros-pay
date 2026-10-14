use super::*;

#[test]
fn refund_cancels_the_subscription_and_signals_entitlement() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    seed_sub(&s, "otx_1", "active", "user_1", "prod_sub");
    apply_apple_notification(&s, "REFUND", &notif_tx("tx_9", Some("otx_1"), None)).unwrap();
    let sub = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "otx_1").unwrap();
    assert_eq!(sub["status"], "canceled");
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn expired_cancels_the_subscription() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    seed_sub(&s, "otx_1", "active", "user_1", "prod_sub");
    apply_apple_notification(&s, "EXPIRED", &notif_tx("tx_9", Some("otx_1"), None)).unwrap();
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "otx_1").unwrap()["status"],
        "canceled"
    );
}

#[test]
fn did_renew_extends_the_period_and_reactivates() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    seed_sub(&s, "otx_1", "active", "user_1", "prod_sub");
    // new expiry in 2030 (ms)
    apply_apple_notification(
        &s,
        "DID_RENEW",
        &notif_tx("tx_9", Some("otx_1"), Some(1_900_000_000_000)),
    )
    .unwrap();
    let sub = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "otx_1").unwrap();
    assert_eq!(sub["status"], "active");
    assert!(sub["currentPeriodEnd"]
        .as_str()
        .unwrap()
        .starts_with("2030"));
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn did_renew_does_not_reactivate_terminal_subscription_found_by_provider_ref() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    seed_sub_with_provider_ref(
        &s,
        "local_sub_1",
        "otx_1",
        "canceled",
        "user_1",
        "prod_sub",
        APPLE_PROVIDER,
    );

    apply_apple_notification(
        &s,
        "DID_RENEW",
        &notif_tx("tx_9", Some("otx_1"), Some(1_900_000_000_000)),
    )
    .unwrap();

    assert!(s.get_entry(ids::MODEL_SUBSCRIPTIONS, "otx_1").is_none());
    let sub = s
        .get_entry(ids::MODEL_SUBSCRIPTIONS, "local_sub_1")
        .unwrap();
    assert_eq!(sub["status"], "canceled");
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}

#[test]
fn refund_of_a_one_time_purchase_marks_the_ledger_refunded() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    seed_ledger(&s, "apple-tx:tx_9", 999, "user_1", "prod_pack");
    apply_apple_notification(&s, "REFUND", &notif_tx("tx_9", None, None)).unwrap();
    let row = s.get_entry(ids::MODEL_LEDGER, "apple-tx:tx_9").unwrap();
    assert_eq!(row["status"], "refunded");
    assert_eq!(row["processedAt"], "2023-01-01T00:00:00Z");
    let refunds = crate::db::Db::new(&s, ids::DB_ACCESS)
        .read(
            ids::MODEL_LEDGER,
            &crate::db::Query::new().filter(crate::db::Filter::new(
                "kind",
                crate::db::Op::Eq,
                "refund",
            )),
        )
        .unwrap();
    assert_eq!(refunds.len(), 1);
    assert_eq!(refunds[0].payload["grossCents"], 999);
    assert_eq!(
        refunds[0].payload["processedAt"],
        crate::time::iso8601(s.now_unix_secs())
    );
    apply_apple_notification(&s, "REFUND", &notif_tx("tx_9", None, None)).unwrap();
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 2);
    // net (gross - refund) falls to zero so payment_grants no longer grants access.
    assert_eq!(row["refundCents"], 999);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn unrelated_notification_type_is_a_noop() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    seed_sub(&s, "otx_1", "active", "user_1", "prod_sub");
    apply_apple_notification(
        &s,
        "DID_CHANGE_RENEWAL_STATUS",
        &notif_tx("tx_9", Some("otx_1"), None),
    )
    .unwrap();
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "otx_1").unwrap()["status"],
        "active",
        "untouched"
    );
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}

#[test]
fn notification_for_an_unknown_subscription_is_safe() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    apply_apple_notification(&s, "REFUND", &notif_tx("tx_9", Some("ghost"), None)).unwrap();
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}

#[test]
fn renewal_without_local_subscription_mapping_is_safe() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);

    apply_apple_notification(
        &s,
        "DID_RENEW",
        &notif_tx("tx_9", Some("ghost"), Some(1_900_000_000_000)),
    )
    .unwrap();

    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 0);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}

#[test]
fn app_identity_validation_rejects_wrong_bundle() {
    let s = FakeSeams::new();
    configure_apple(&s, false);
    let cfg = native_store::apple_config(&s).unwrap();
    let err =
        validate_notification_app(&cfg, Some("com.evil.app"), Some("Production")).unwrap_err();
    assert_eq!(err.status, 403);
    assert_eq!(err.code, "bundle_mismatch");
}

#[test]
fn app_identity_validation_rejects_sandbox_when_disabled() {
    let s = FakeSeams::new();
    configure_apple(&s, false);
    let cfg = native_store::apple_config(&s).unwrap();
    let err = validate_notification_app(&cfg, Some("com.acme.app"), Some("Sandbox")).unwrap_err();
    assert_eq!(err.status, 403);
    assert_eq!(err.code, "environment_mismatch");
}

#[test]
fn app_identity_validation_accepts_sandbox_when_enabled() {
    let s = FakeSeams::new();
    configure_apple(&s, true);
    let cfg = native_store::apple_config(&s).unwrap();
    validate_notification_app(&cfg, Some("com.acme.app"), Some("Sandbox")).unwrap();
}

#[test]
fn apple_notification_does_not_mutate_non_apple_subscription() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    seed_sub_with_provider(&s, "otx_1", "active", "user_1", "prod_sub", "stripe");

    apply_apple_notification(&s, "EXPIRED", &notif_tx("tx_9", Some("otx_1"), None)).unwrap();

    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "otx_1").unwrap()["status"],
        "active"
    );
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}

#[test]
fn apple_notification_does_not_mutate_non_apple_ledger() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    seed_ledger_with_provider(&s, "apple-tx:tx_9", 999, "user_1", "prod_pack", "stripe");

    apply_apple_notification(&s, "REFUND", &notif_tx("tx_9", None, None)).unwrap();

    let row = s.get_entry(ids::MODEL_LEDGER, "apple-tx:tx_9").unwrap();
    assert_eq!(row["status"], "succeeded");
    assert_eq!(row["refundCents"], 0);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}
