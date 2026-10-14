use super::*;
use crate::fake::FakeSeams;
use crate::x402::refund::RefundRequest;
use crate::x402::transaction;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use ed25519_dalek::{Signer, SigningKey};
use serde_json::{json, Value};

const BUYER_WALLET: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const PURCHASE_SIG: &str =
    "BUguQsv2ZuHus54HAFzjdJHzZBkygAjKhEeYwSG19tUfUyvvz3worsdQCdAXDNjakJHioSiyxhFiDJrm8XpSXRA";
const REFUND_ID: &str = "refund_testfixedid0123456789abcd";
const MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const BLOCKHASH: &str = "11111111111111111111111111111111";

fn seed_original(s: &FakeSeams) {
    s.seed(
        ids::MODEL_LEDGER,
        PURCHASE_SIG,
        json!({
            "reference": PURCHASE_SIG, "kind": "payment", "status": "succeeded",
            "grossCents": 1500, "refundCents": 0, "currency": "USD",
            "productId": "prod_widget", "customerProfileId": "buyer_42",
            "provider": "x402", "providerRef": PURCHASE_SIG,
            "payerWallet": BUYER_WALLET,
            "tokenSettlement": {"amountAtomic": 15_000_000, "mint": MINT, "decimals": 6},
            "createdAt": "2026-06-01T00:00:00Z", "processedAt": "2026-06-01T00:00:00Z"
        }),
    );
}

fn seed_refund(s: &FakeSeams, status: &str, signature: Option<&str>) {
    let settlement = signature.map(|_| {
        json!({
            "transactionBase64": crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO,
            "recentBlockhash": BLOCKHASH,
            "network": "mainnet-beta"
        })
    });
    s.seed(
        ids::MODEL_LEDGER,
        REFUND_ID,
        json!({
            "reference": REFUND_ID, "kind": "refund", "status": status,
            "grossCents": 1500, "refundCents": 0, "currency": "USD",
            "productId": "prod_widget", "customerProfileId": "buyer_42",
            "provider": "x402", "providerRef": signature,
            "settlement": settlement,
            "createdAt": "2026-06-02T00:00:00Z", "processedAt": "2026-06-02T00:00:00Z",
            "originalPurchaseId": PURCHASE_SIG, "recipientWallet": BUYER_WALLET
        }),
    );
}

fn managed_signer() -> (SigningKey, crate::blockchain_config::ManagedX402Signer) {
    let signing = SigningKey::from_bytes(&[0x11; 32]);
    let signer = crate::blockchain_config::ManagedX402Signer {
        wallet_id: "wallet-id".into(),
        wallet_version_id: "wallet-version".into(),
        public_key: crate::x402::pubkey::encode(&signing.verifying_key().to_bytes()),
        cluster: "mainnet-beta".into(),
    };
    (signing, signer)
}

fn configure_start(s: &FakeSeams, signer: &crate::blockchain_config::ManagedX402Signer) {
    s.set_blockchain_config(json!({
        "available": true,
        "mainWalletAddress": "vault-address",
        "managedWallet": {
            "vaultWalletId": signer.wallet_id,
            "activeVersionId": signer.wallet_version_id,
            "publicKey": signer.public_key,
            "cluster": signer.cluster,
            "status": "active"
        },
        "treasury": {
            "provider": "squads-v4", "treasuryId": "treasury-id",
            "multisigAddress": "multisig-address", "vaultAddress": "vault-address",
            "cluster": signer.cluster, "threshold": 1, "status": "active"
        },
        "allowedTokenMints": [MINT],
        "solana": {
            "rpcUrl": "https://rpc.example.com", "rpcSecretConfigured": true,
            "network": signer.cluster
        }
    }));
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":"5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"}"#,
    );
    s.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":{"value":{
            "blockhash": BLOCKHASH, "lastValidBlockHeight": 123
        }}})
        .to_string(),
    );
}

fn expected_request(signer: &crate::blockchain_config::ManagedX402Signer) -> RefundRequest {
    crate::x402::refund::build_request(
        signer,
        REFUND_ID,
        BLOCKHASH,
        MINT,
        15_000_000,
        6,
        BUYER_WALLET,
        PURCHASE_SIG,
    )
    .unwrap()
}

fn core_response(
    signing: &SigningKey,
    signer: &crate::blockchain_config::ManagedX402Signer,
    request: &RefundRequest,
    status: &str,
    error_code: Option<&str>,
    retryable: bool,
    evidence: bool,
    replayed: bool,
) -> Value {
    let (signature, signed_transaction_base64) = if evidence {
        let bytes = BASE64
            .decode(&request.serialized_transaction_base64)
            .unwrap();
        let mut parsed = transaction::parse(&bytes).unwrap();
        parsed.signatures[0] = signing.sign(&parsed.message_bytes).to_bytes();
        (
            Some(crate::x402::pubkey::encode_signature(&parsed.signatures[0])),
            Some(BASE64.encode(parsed.serialize())),
        )
    } else {
        (None, None)
    };
    json!({
        "contractVersion": "1.0.0",
        "operationId": "operation-id",
        "refundId": request.refund_id,
        "status": status,
        "errorCode": error_code,
        "retryable": retryable,
        "signature": signature,
        "signedTransactionBase64": signed_transaction_base64,
        "transactionSha256": evidence.then_some(request.transaction_sha256.clone()),
        "recentBlockhash": evidence.then_some(request.recent_blockhash.clone()),
        "network": "solana",
        "cluster": request.cluster,
        "walletId": signer.wallet_id,
        "walletVersionId": signer.wallet_version_id,
        "policyDecisionId": evidence.then_some("policy-id"),
        "signedAt": evidence.then_some("2026-09-16T00:00:00Z"),
        "replayed": replayed
    })
}

fn refund_signature() -> String {
    use base64::Engine as _;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO)
        .unwrap();
    let parsed = crate::x402::transaction::parse(&bytes).unwrap();
    crate::x402::pubkey::encode_signature(&parsed.signatures[0])
}

fn admin_process() -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_ADMIN_REFUNDS_PROCESS.into(),
        method: "POST".into(),
        path: format!("/admin/refunds/{REFUND_ID}/process"),
        context_json:
            r#"{"authenticated":true,"systemAdmin":true,"csrfVerified":true,"permissionClaims":["manage_settings"]}"#
                .into(),
        ..Default::default()
    }
}

fn admin_deny() -> RouteRequest {
    let mut req = admin_process();
    req.route_id = ids::ROUTE_ADMIN_REFUNDS_DENY.into();
    req.path = format!("/admin/refunds/{REFUND_ID}/deny");
    req
}

fn body(out: &RouteResponse) -> Value {
    serde_json::from_str(&out.body).unwrap()
}

#[test]
fn pending_refund_uses_core_and_persists_the_complete_response() {
    let s = FakeSeams::new();
    seed_original(&s);
    seed_refund(&s, "pending", None);
    let (signing, signer) = managed_signer();
    configure_start(&s, &signer);
    let request = expected_request(&signer);
    let response = core_response(
        &signing,
        &signer,
        &request,
        "submitted",
        None,
        false,
        true,
        false,
    );
    s.push_provider_response(response.clone());

    let out = body(&process(&s, &admin_process()).unwrap());

    assert_eq!(out["status"], "submitted");
    assert_eq!(out["providerStatus"], "submitted");
    let row = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    assert_eq!(row["status"], "submitted");
    assert_eq!(row["signingAttempt"]["response"], response);
    assert_eq!(row["settlement"]["network"], "mainnet-beta");
    assert_eq!(s.http_requests.borrow().len(), 2);
    assert!(s.secret_reads.borrow().is_empty());
    let provider_requests = s.provider_requests.borrow();
    let call = provider_requests
        .iter()
        .find(|entry| entry.2 == ids::OP_BLOCKCHAIN_X402_REFUND)
        .unwrap();
    assert_eq!(call.0, ids::PROVIDER_BLOCKCHAIN_X402_REFUND);
    assert_eq!(call.1, ids::PROVIDER_BLOCKCHAIN);
    assert_eq!(call.3, serde_json::to_value(&request).unwrap());
    for forbidden in [
        "walletId",
        "recipientOverride",
        "tokenAccountOverride",
        "memo",
        "programs",
        "priorityFee",
    ] {
        assert!(call.3.get(forbidden).is_none(), "unexpected {forbidden}");
    }
}

#[test]
fn unavailable_managed_signer_is_retryable_without_mutating_the_refund() {
    let s = FakeSeams::new();
    seed_original(&s);
    seed_refund(&s, "pending", None);
    let before = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();

    let error = process(&s, &admin_process()).unwrap_err();

    assert_eq!(
        (error.status, error.code),
        (503, "refund_signer_unavailable")
    );
    assert_eq!(s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap(), before);
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn response_loss_retries_the_exact_persisted_operation_after_restart() {
    let s = FakeSeams::new();
    seed_original(&s);
    seed_refund(&s, "pending", None);
    let (signing, signer) = managed_signer();
    configure_start(&s, &signer);
    s.push_provider_error("response lost after provider invocation");

    let first = process(&s, &admin_process()).unwrap_err();
    assert_eq!(first.code, "refund_signer_unavailable");
    let after_loss = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    assert_eq!(after_loss["status"], "pending");
    assert!(after_loss["signingAttempt"]["response"].is_null());
    assert_eq!(deny(&s, &admin_deny()).unwrap_err().status, 422);
    let request: RefundRequest =
        serde_json::from_value(after_loss["signingAttempt"]["request"].clone()).unwrap();
    s.push_provider_response(core_response(
        &signing,
        &signer,
        &request,
        "submitted",
        None,
        false,
        true,
        true,
    ));

    let out = body(&process(&s, &admin_process()).unwrap());

    assert_eq!(out["status"], "submitted");
    assert_eq!(out["replayed"], true);
    assert_eq!(
        s.http_requests.borrow().len(),
        2,
        "blockhash was not refreshed"
    );
    let calls = s
        .provider_requests
        .borrow()
        .iter()
        .filter(|entry| entry.2 == ids::OP_BLOCKCHAIN_X402_REFUND)
        .map(|entry| entry.3.clone())
        .collect::<Vec<_>>();
    assert_eq!(calls, vec![calls[0].clone(), calls[0].clone()]);
}

#[test]
fn core_signer_outage_persists_diagnostics_and_retries_same_request() {
    let s = FakeSeams::new();
    seed_original(&s);
    seed_refund(&s, "pending", None);
    let (signing, signer) = managed_signer();
    configure_start(&s, &signer);
    let request = expected_request(&signer);
    let unavailable = core_response(
        &signing,
        &signer,
        &request,
        "failed",
        Some("refund_signer_unavailable"),
        true,
        false,
        false,
    );
    s.push_provider_response(unavailable.clone());

    let error = process(&s, &admin_process()).unwrap_err();

    assert_eq!(
        (error.status, error.code),
        (503, "refund_signer_unavailable")
    );
    let pending = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    assert_eq!(pending["status"], "pending");
    assert_eq!(pending["signingAttempt"]["response"], unavailable);
    s.push_provider_response(core_response(
        &signing,
        &signer,
        &request,
        "submitted",
        None,
        false,
        true,
        false,
    ));

    assert_eq!(
        body(&process(&s, &admin_process()).unwrap())["status"],
        "submitted"
    );
    assert_eq!(s.http_requests.borrow().len(), 2, "request was not rebuilt");
}

#[test]
fn concurrent_process_calls_converge_on_one_signed_operation() {
    let s = FakeSeams::new();
    seed_original(&s);
    seed_refund(&s, "pending", None);
    let (signing, signer) = managed_signer();
    configure_start(&s, &signer);
    s.push_provider_error("first worker is still awaiting Core");
    assert_eq!(
        process(&s, &admin_process()).unwrap_err().code,
        "refund_signer_unavailable"
    );
    let mut winner = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    let request: RefundRequest =
        serde_json::from_value(winner["signingAttempt"]["request"].clone()).unwrap();
    let first = core_response(
        &signing,
        &signer,
        &request,
        "submitted",
        None,
        false,
        true,
        false,
    );
    let replay = core_response(
        &signing,
        &signer,
        &request,
        "submitted",
        None,
        false,
        true,
        true,
    );
    winner["status"] = json!("submitted");
    winner["providerRef"] = first["signature"].clone();
    winner["settlement"] = json!({
        "transactionBase64": first["signedTransactionBase64"],
        "recentBlockhash": first["recentBlockhash"],
        "network": "mainnet-beta"
    });
    winner["signingAttempt"]["response"] = first;
    s.queue_guarded_race(vec![(ids::MODEL_LEDGER, REFUND_ID, winner)]);
    s.push_provider_response(replay);

    let out = body(&process(&s, &admin_process()).unwrap());

    assert_eq!(out["status"], "submitted");
    let row = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    assert_eq!(row["status"], "submitted");
    assert_eq!(row["signingAttempt"]["response"]["replayed"], false);
}

#[test]
fn crash_before_response_commit_recovers_core_evidence_on_restart() {
    let s = FakeSeams::new();
    seed_original(&s);
    seed_refund(&s, "pending", None);
    let (signing, signer) = managed_signer();
    let request = expected_request(&signer);
    let mut prepared = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    prepared["signingAttempt"] = json!({
        "request": request,
        "signerWalletId": signer.wallet_id,
        "signerPublicKey": signer.public_key
    });
    s.seed(ids::MODEL_LEDGER, REFUND_ID, prepared);
    s.push_provider_response(core_response(
        &signing,
        &signer,
        &request,
        "submitted",
        None,
        false,
        true,
        false,
    ));
    s.fail_next_guarded_batch_after(1);

    assert_eq!(process(&s, &admin_process()).unwrap_err().status, 500);
    let after_crash = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    assert_eq!(after_crash["status"], "pending");
    assert!(after_crash["signingAttempt"]["response"].is_null());
    s.push_provider_response(core_response(
        &signing,
        &signer,
        &request,
        "submitted",
        None,
        false,
        true,
        true,
    ));

    let recovered = body(&process(&s, &admin_process()).unwrap());

    assert_eq!(recovered["status"], "submitted");
    assert_eq!(recovered["replayed"], true);
    assert!(
        s.http_requests.borrow().is_empty(),
        "transaction was not rebuilt"
    );
}

#[test]
fn signed_retryable_failure_is_never_rebuilt_or_deniable() {
    let s = FakeSeams::new();
    seed_original(&s);
    seed_refund(&s, "pending", None);
    let (signing, signer) = managed_signer();
    configure_start(&s, &signer);
    let request = expected_request(&signer);
    s.push_provider_response(core_response(
        &signing,
        &signer,
        &request,
        "failed",
        Some("insufficient_balance"),
        true,
        true,
        false,
    ));

    let error = process(&s, &admin_process()).unwrap_err();

    assert_eq!((error.status, error.code), (503, "insufficient_balance"));
    let row = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    assert_eq!(row["status"], "submitted");
    assert!(row["providerRef"].as_str().is_some());
    assert_eq!(deny(&s, &admin_deny()).unwrap_err().status, 422);
}

#[test]
fn final_core_failure_is_persisted_without_a_signature() {
    let s = FakeSeams::new();
    seed_original(&s);
    seed_refund(&s, "pending", None);
    let (signing, signer) = managed_signer();
    configure_start(&s, &signer);
    let request = expected_request(&signer);
    let response = core_response(
        &signing,
        &signer,
        &request,
        "failed",
        Some("wallet_rotated_or_unavailable"),
        false,
        false,
        false,
    );
    s.push_provider_response(response.clone());

    let error = process(&s, &admin_process()).unwrap_err();

    assert_eq!(
        (error.status, error.code),
        (409, "wallet_rotated_or_unavailable")
    );
    let row = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    assert_eq!(row["status"], "failed");
    assert_eq!(row["signingAttempt"]["response"], response);
}

#[test]
fn ambiguous_broadcast_and_expired_blockhash_preserve_the_signed_bytes() {
    for (provider_status, error_code, retryable, expected_status) in [
        ("indeterminate", "broadcast_ambiguous", true, "submitted"),
        ("failed", "blockhash_expired", false, "failed"),
    ] {
        let s = FakeSeams::new();
        seed_original(&s);
        seed_refund(&s, "pending", None);
        let (signing, signer) = managed_signer();
        configure_start(&s, &signer);
        let request = expected_request(&signer);
        s.push_provider_response(core_response(
            &signing,
            &signer,
            &request,
            provider_status,
            Some(error_code),
            retryable,
            true,
            false,
        ));

        let result = process(&s, &admin_process());
        if provider_status == "indeterminate" {
            assert_eq!(body(&result.unwrap())["providerStatus"], "indeterminate");
        } else {
            assert_eq!(result.unwrap_err().code, "blockhash_expired");
        }
        let row = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
        assert_eq!(row["status"], expected_status);
        assert_eq!(
            row["settlement"]["transactionBase64"],
            row["signingAttempt"]["response"]["signedTransactionBase64"]
        );
        assert!(row["providerRef"].as_str().is_some());
    }
}

#[test]
fn resume_repolls_an_existing_signature_without_rebuilding() {
    let s = FakeSeams::new();
    s.set_blockchain_rpc("https://rpc.example.com");
    seed_original(&s);
    let signature = refund_signature();
    seed_refund(&s, "submitted", Some(&signature));
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":"5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"}"#,
    );
    s.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":{"value":[{"err":null,"confirmationStatus":"finalized"}]}}).to_string(),
    );
    s.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":crate::x402::rpc_fixtures::transaction_result(crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO, serde_json::Value::Null, crate::x402::rpc_fixtures::MERCHANT)})
        .to_string(),
    );

    let out = body(&process(&s, &admin_process()).unwrap());

    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, PURCHASE_SIG).unwrap()["processedAt"],
        "2026-06-01T00:00:00Z"
    );
    assert_eq!(out["status"], "succeeded");
    assert_eq!(out["signature"], signature);
    assert_eq!(s.http_requests.borrow().len(), 3);
    assert!(s.secret_reads.borrow().is_empty());
}

#[test]
fn already_succeeded_refund_is_idempotent_without_chain_access() {
    let s = FakeSeams::new();
    seed_original(&s);
    seed_refund(&s, "succeeded", Some("prior-sig"));

    let out = body(&process(&s, &admin_process()).unwrap());

    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, PURCHASE_SIG).unwrap()["processedAt"],
        "2026-06-01T00:00:00Z"
    );
    assert_eq!(out["status"], "succeeded");
    assert_eq!(out["signature"], "prior-sig");
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn deny_moves_only_a_pending_refund_to_denied() {
    let s = FakeSeams::new();
    seed_original(&s);
    seed_refund(&s, "pending", None);
    assert_eq!(body(&deny(&s, &admin_deny()).unwrap())["status"], "denied");

    let in_flight = FakeSeams::new();
    seed_original(&in_flight);
    seed_refund(&in_flight, "submitted", Some("sig"));
    assert_eq!(deny(&in_flight, &admin_deny()).unwrap_err().status, 422);
}

#[test]
fn process_requires_admin_authority_before_signer_state() {
    let s = FakeSeams::new();
    seed_original(&s);
    seed_refund(&s, "pending", None);
    let mut req = admin_process();
    req.context_json = r#"{"authenticated":false}"#.into();
    assert_eq!(process(&s, &req).unwrap_err().status, 401);

    let mut no_csrf = admin_process();
    no_csrf.context_json = r#"{"authenticated":true,"systemAdmin":true}"#.into();
    assert_eq!(process(&s, &no_csrf).unwrap_err().status, 403);
}

#[test]
fn unknown_refund_is_404_and_path_ids_are_bounded() {
    let s = FakeSeams::new();
    assert_eq!(process(&s, &admin_process()).unwrap_err().status, 404);
    assert_eq!(
        refund_id_from_process_path("/admin/refunds/refund_abc/process"),
        Some("refund_abc")
    );
    assert_eq!(refund_id_from_process_path("/admin/refunds//process"), None);
}

#[test]
fn altered_persisted_refund_request_cannot_reach_the_wallet_signer() {
    for field in [
        "refundAmountMicrounits",
        "serializedTransactionBase64",
        "originalPayer",
    ] {
        let s = FakeSeams::new();
        seed_original(&s);
        seed_refund(&s, "pending", None);
        let (_, signer) = managed_signer();
        configure_start(&s, &signer);
        s.push_provider_error("response lost");
        assert!(process(&s, &admin_process()).is_err());
        let id = REFUND_ID.to_string();
        let mut row = s.get_entry(ids::MODEL_LEDGER, &id).unwrap();
        row["signingAttempt"]["request"][field] = if field == "refundAmountMicrounits" {
            json!(1)
        } else {
            json!("substituted")
        };
        s.seed(ids::MODEL_LEDGER, &id, row);
        let before = s.provider_requests.borrow().len();
        let error = process(&s, &admin_process()).unwrap_err();
        assert_eq!(error.status, 409, "field: {field}");
        assert_eq!(s.provider_requests.borrow().len(), before);
    }
}
