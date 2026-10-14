use super::*;
use crate::fake::FakeSeams;
use serde_json::Value;

#[test]
fn reads_blockchain_config_through_provider_seam() {
    let seams = FakeSeams::new();
    let status = read_status(&seams);
    assert!(!status.configured);
    assert_eq!(
        seams.provider_requests.borrow()[0],
        (
            ids::PROVIDER_BLOCKCHAIN_CONFIG.to_string(),
            ids::PROVIDER_BLOCKCHAIN.to_string(),
            ids::OP_BLOCKCHAIN_CONFIG_READ.to_string(),
            Value::Object(Default::default())
        )
    );
}

#[test]
fn parses_readiness_without_exposing_rpc_secret() {
    let status = parse_status(
        r#"{"mainWalletAddress":"wallet","solana":{"rpcUrl":"https://rpc","rpcSecretConfigured":true,"network":"mainnet","commitment":"confirmed"}}"#,
    );
    assert!(status.configured);
    assert!(status.main_wallet_configured);
    assert_eq!(status.solana.unwrap().network.as_deref(), Some("mainnet"));
}

#[test]
fn reads_solana_rpc_url_from_blockchain_provider() {
    let seams = FakeSeams::new();
    seams.push_provider_response(serde_json::json!({
        "solana": { "rpcUrl": "https://rpc.example" }
    }));
    let rpc_url = read_solana_rpc_url(&seams).unwrap();
    assert_eq!(rpc_url, "https://rpc.example");
    assert_eq!(
        seams.provider_requests.borrow()[0].2,
        ids::OP_BLOCKCHAIN_CONFIG_READ
    );
}

#[test]
fn rejects_missing_solana_rpc_url() {
    let seams = FakeSeams::new();
    seams.push_provider_response(serde_json::json!({
        "solana": { "network": "mainnet" }
    }));
    let err = read_solana_rpc_url(&seams).unwrap_err();
    assert_eq!(err.status, 503);
    assert_eq!(err.code, "service_unavailable");
}

fn managed_config() -> Value {
    serde_json::json!({
        "available": true,
        "mainWalletAddress": "vault-address",
        "managedWallet": {
            "vaultWalletId": "wallet-id", "activeVersionId": "version-id",
            "publicKey": "operational-address", "cluster": "devnet", "status": "active"
        },
        "treasury": {
            "provider": "squads-v4", "treasuryId": "treasury-id",
            "multisigAddress": "multisig-address", "vaultAddress": "vault-address",
            "cluster": "devnet", "threshold": 2, "status": "active"
        },
        "solana": {"rpcUrl": "https://rpc.example", "network": "devnet"}
    })
}

#[test]
fn managed_control_uses_squads_vault_and_active_signer() {
    let seams = FakeSeams::new();
    seams.set_blockchain_config(managed_config());
    let control =
        resolve_x402_control(&seams, Some("legacy-address".into()), "solana".into()).unwrap();
    assert_eq!(control.pay_to, "vault-address");
    assert_eq!(control.network, "devnet");
    let signer = control.managed_signer.unwrap();
    assert_eq!(signer.wallet_id, "wallet-id");
    assert_eq!(signer.wallet_version_id, "version-id");
    assert_eq!(signer.public_key, "operational-address");
}

#[test]
fn legacy_control_remains_available_without_managed_projection() {
    let seams = FakeSeams::new();
    seams.set_blockchain_rpc("https://rpc.example");
    let control =
        resolve_x402_control(&seams, Some("legacy-address".into()), "solana".into()).unwrap();
    assert_eq!(control.pay_to, "legacy-address");
    assert!(control.managed_signer.is_none());
}

#[test]
fn any_unsafe_managed_projection_fails_without_legacy_fallback() {
    let mutations: [fn(&mut Value); 5] = [
        |value| value["available"] = serde_json::json!(false),
        |value| value["managedWallet"]["status"] = serde_json::json!("rotating"),
        |value| value["treasury"]["status"] = serde_json::json!("blocked"),
        |value| value["treasury"]["cluster"] = serde_json::json!("mainnet-beta"),
        |value| value["managedWallet"]["activeVersionId"] = Value::Null,
    ];
    for mutate in mutations {
        let seams = FakeSeams::new();
        let mut config = managed_config();
        mutate(&mut config);
        seams.set_blockchain_config(config);
        let error = resolve_x402_control(&seams, Some("legacy-address".into()), "solana".into())
            .unwrap_err();
        assert_eq!((error.status, error.code), (503, "x402_unavailable"));
    }
}

#[test]
fn a_single_managed_projection_never_falls_back_to_legacy() {
    let seams = FakeSeams::new();
    let mut config = managed_config();
    config["treasury"] = Value::Null;
    seams.set_blockchain_config(config);
    assert!(resolve_x402_control(&seams, Some("legacy-address".into()), "solana".into()).is_err());
}

fn assistant_config(status: &str, available: bool) -> Value {
    serde_json::json!({
        "available": true,
        "mainWalletAddress": "merchant-vault-is-not-the-payer",
        "assistantWalletAvailable": available,
        "assistantWallet": {
            "vaultWalletId": "assistant-wallet-id", "activeVersionId": "assistant-version-id",
            "publicKey": bs58::encode([17_u8; 32]).into_string(),
            "cluster": "devnet", "status": status
        },
        "managedWallet": {
            "vaultWalletId": "operational-wallet-id", "activeVersionId": "operational-version-id",
            "publicKey": bs58::encode([18_u8; 32]).into_string(),
            "cluster": "devnet", "status": "active"
        },
        "treasury": {
            "provider": "squads-v4", "vaultAddress": bs58::encode([19_u8; 32]).into_string(),
            "cluster": "devnet", "status": "active"
        },
        "allowedTokenMints": [bs58::encode([20_u8; 32]).into_string()],
        "solana": {"rpcUrl":"https://rpc.example","network":"devnet"}
    })
}

#[test]
fn assistant_control_uses_only_the_dedicated_projection() {
    let seams = FakeSeams::new();
    seams.set_blockchain_config(assistant_config("active", true));
    let control = resolve_assistant_x402_control(&seams).unwrap();
    assert_eq!(control.wallet_id, "assistant-wallet-id");
    assert_eq!(control.wallet_version_id, "assistant-version-id");
    assert_eq!(control.public_key, bs58::encode([17_u8; 32]).into_string());
    assert_eq!(control.cluster, "devnet");
    assert_eq!(
        control.allowed_token_mints,
        [bs58::encode([20_u8; 32]).into_string()]
    );
}

#[test]
fn assistant_control_has_no_unavailable_or_status_fallback() {
    for (status, available, code) in [
        ("active", false, "wallet_unavailable"),
        ("rotating", false, "wallet_rotating"),
        ("disabled", false, "wallet_disabled"),
        ("blocked", false, "wallet_blocked"),
    ] {
        let seams = FakeSeams::new();
        seams.set_blockchain_config(assistant_config(status, available));
        assert_eq!(
            resolve_assistant_x402_control(&seams).unwrap_err().code,
            code
        );
    }
    let seams = FakeSeams::new();
    let mut config = assistant_config("active", true);
    config["assistantWallet"] = Value::Null;
    seams.set_blockchain_config(config);
    assert_eq!(
        resolve_assistant_x402_control(&seams).unwrap_err().code,
        "wallet_unavailable"
    );
}

#[test]
fn assistant_control_rejects_provider_cluster_mismatch() {
    let seams = FakeSeams::new();
    let mut config = assistant_config("active", true);
    config["solana"]["network"] = serde_json::json!("mainnet-beta");
    seams.set_blockchain_config(config);
    assert_eq!(
        resolve_assistant_x402_control(&seams).unwrap_err().code,
        "cluster_mismatch"
    );
}

#[test]
fn readiness_provider_errors_never_log_rpc_credentials() {
    let seams = FakeSeams::new();
    seams.push_provider_error(
        "RPC failed https://rpc.example/?api-key=secret-token buyer@example.test",
    );
    let status = read_status(&seams);
    assert!(!status.configured);
    assert_eq!(status.error.as_deref(), Some("provider_unavailable"));
    let logs = seams.logs.borrow();
    assert!(!logs.is_empty());
    assert!(!format!("{logs:?}").contains("secret-token"));
    assert!(!format!("{logs:?}").contains("buyer@example.test"));
    assert!(!format!("{logs:?}").contains("rpc.example"));
}
