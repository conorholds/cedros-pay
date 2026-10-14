use super::*;
use crate::fake::FakeSeams;

fn configure_all(seams: &FakeSeams) {
    seams.set_setting(STRIPE_ENABLED, "true");
    seams.set_setting(STRIPE_PUBLISHABLE_KEY, "pk_test");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    seams.set_setting(X402_ENABLED, "true");
    seams.set_setting(X402_PAYMENT_ADDRESS, "wallet");
    seams.set_setting(X402_TOKEN_MINT, "mint");
    seams.set_blockchain_rpc("https://rpc.example");
    seams.set_setting(CEDROS_LOGIN_ENABLED, "true");
    seams.set_setting(CEDROS_LOGIN_CREDITS_ENABLED, "true");
}

#[test]
fn missing_marker_disables_every_rail_before_provider_egress() {
    let seams = FakeSeams::new();
    configure_all(&seams);

    assert_eq!(bridge_payload(&seams).unwrap(), unavailable_payload());
    assert!(seams.provider_requests.borrow().is_empty());
    assert!(seams.http_requests.borrow().is_empty());
}

#[test]
fn exact_marker_and_complete_configuration_enable_every_rail() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    configure_all(&seams);

    let payload = bridge_payload(&seams).unwrap();

    assert_eq!(payload["paymentMethods"]["stripe"]["available"], true);
    assert_eq!(payload["paymentMethods"]["x402"]["available"], true);
    assert_eq!(payload["paymentMethods"]["credits"]["available"], true);
}

#[test]
fn rails_fail_closed_when_required_config_is_missing_or_malformed() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    configure_all(&seams);
    seams.set_setting(STRIPE_ENABLED, "yes");
    seams.set_setting(CEDROS_LOGIN_CREDITS_ENABLED, "false");

    let payload = bridge_payload(&seams).unwrap();

    assert_eq!(payload["paymentMethods"]["stripe"]["available"], false);
    assert_eq!(payload["paymentMethods"]["x402"]["available"], true);
    assert_eq!(payload["paymentMethods"]["credits"]["available"], false);
}

#[test]
fn projected_overrides_are_applied_without_writing_settings() {
    let seams = FakeSeams::new();
    configure_all(&seams);
    crate::guarded_policy::enroll(&seams).unwrap();
    let overrides = std::collections::BTreeMap::from([
        (STRIPE_ENABLED.to_string(), serde_json::json!(false)),
        (CEDROS_LOGIN_CREDITS_ENABLED.to_string(), Value::Bool(false)),
    ]);

    let snapshot = bridge_payload_with_overrides(&seams, &overrides).unwrap();

    assert_eq!(snapshot["paymentMethods"]["stripe"]["available"], false);
    assert_eq!(snapshot["paymentMethods"]["credits"]["available"], false);
    assert_eq!(
        seams
            .setting_get(ids::SETTING_SHOP_PAYMENT_AVAILABILITY_SNAPSHOT)
            .unwrap(),
        None,
        "projection must not perform the old out-of-transaction write"
    );
}

fn managed_blockchain(status: &str, available: bool) -> Value {
    serde_json::json!({
        "available": available,
        "mainWalletAddress": "vault-address",
        "managedWallet": {
            "vaultWalletId": "wallet-id",
            "activeVersionId": "version-id",
            "publicKey": "operational-address",
            "cluster": "devnet",
            "status": status
        },
        "treasury": {
            "provider": "squads-v4",
            "treasuryId": "treasury-id",
            "multisigAddress": "multisig-address",
            "vaultAddress": "vault-address",
            "cluster": "devnet",
            "threshold": 2,
            "status": "active"
        },
        "solana": { "rpcUrl": "https://rpc.example", "network": "devnet" }
    })
}

#[test]
fn active_managed_control_replaces_the_legacy_payout_requirement() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    seams.set_setting(X402_ENABLED, "true");
    seams.set_setting(X402_TOKEN_MINT, "mint");
    seams.set_blockchain_config(managed_blockchain("active", true));

    let payload = bridge_payload(&seams).unwrap();

    assert_eq!(payload["paymentMethods"]["x402"]["available"], true);
}

#[test]
fn rotating_or_unavailable_managed_control_disables_x402() {
    for config in [
        managed_blockchain("rotating", true),
        managed_blockchain("active", false),
    ] {
        let seams = FakeSeams::new();
        crate::guarded_policy::enroll(&seams).unwrap();
        seams.set_setting(X402_ENABLED, "true");
        seams.set_setting(X402_PAYMENT_ADDRESS, "legacy-wallet");
        seams.set_setting(X402_TOKEN_MINT, "mint");
        seams.set_blockchain_config(config);

        let payload = bridge_payload(&seams).unwrap();

        assert_eq!(payload["paymentMethods"]["x402"]["available"], false);
    }
}
