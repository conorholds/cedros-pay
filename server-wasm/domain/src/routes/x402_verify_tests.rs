use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;

use super::*;
use crate::fake::FakeSeams;
use ed25519_dalek::{Signer, SigningKey};
use serde_json::Value;
use sha2::{Digest, Sha256};

fn configure_x402(s: &FakeSeams) {
    s.set_setting("x402.enabled", "true");
    s.set_setting(
        "x402.payment_address",
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    );
    s.set_setting(
        "x402.token_mint",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    );
    s.set_setting("x402.token_decimals", "6");
}

fn push_genesis(s: &FakeSeams, network: &str) {
    let hash = match network {
        "devnet" => "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
        _ => "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
    };
    s.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":hash}).to_string(),
    );
}

fn push_confirmed_transaction(s: &FakeSeams, transaction: &str, error: Value) {
    s.push_http_response(
        200,
        &json!({
            "jsonrpc":"2.0","id":1,
            "result":crate::x402::rpc_fixtures::transaction_result(transaction, error, crate::x402::rpc_fixtures::MERCHANT)
        })
        .to_string(),
    );
}

fn verify_req(x_payment_json: Value) -> RouteRequest {
    let header = BASE64.encode(x_payment_json.to_string());
    RouteRequest {
        route_id: ids::ROUTE_VERIFY.into(),
        method: "POST".into(),
        path: "/paywall/v1/verify".into(),
        headers: vec![("x-payment".into(), header)],
        ..Default::default()
    }
}

struct ManagedTransaction {
    partial: String,
    signed: String,
    signature: String,
    operational_public_key: String,
    transaction_sha256: String,
}

fn managed_transaction() -> ManagedTransaction {
    let operational = SigningKey::from_bytes(&[0x11; 32]);
    let buyer = SigningKey::from_bytes(&[0x22; 32]);
    let operational_key = operational.verifying_key().to_bytes();
    let buyer_key = buyer.verifying_key().to_bytes();
    let mint = crate::x402::pubkey::parse("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU").unwrap();
    let destination = crate::x402::pubkey::parse(
        &crate::x402::ata::derive_token_account(
            "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
            "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        )
        .unwrap(),
    )
    .unwrap();
    let account_keys = vec![
        operational_key,
        buyer_key,
        [0x33; 32],
        destination,
        mint,
        crate::x402::pubkey::parse("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap(),
        crate::x402::pubkey::parse("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr").unwrap(),
    ];
    let mut transfer_data = vec![12];
    transfer_data.extend_from_slice(&1_500_000_u64.to_le_bytes());
    transfer_data.push(6);
    let instructions = vec![
        crate::x402::transaction::CompiledInstruction {
            program_id_index: 5,
            accounts: vec![2, 4, 3, 1],
            data: transfer_data,
        },
        crate::x402::transaction::CompiledInstruction {
            program_id_index: 6,
            accounts: Vec::new(),
            data: b"resource=prod_1;request=managed-integration".to_vec(),
        },
    ];
    let blockhash = [7; 32];
    let message = crate::x402::transaction::build_legacy_message(
        2,
        1,
        3,
        &account_keys,
        &blockhash,
        &instructions,
    );
    let mut transaction = crate::x402::transaction::ParsedTransaction {
        signatures: vec![[0; 64], buyer.sign(&message).to_bytes()],
        num_required_signatures: 2,
        account_keys,
        recent_blockhash: blockhash,
        instructions,
        message_bytes: message,
        version: None,
        has_address_table_lookups: false,
    };
    let partial_bytes = transaction.serialize();
    let partial = BASE64.encode(&partial_bytes);
    let transaction_sha256 = hex::encode(Sha256::digest(&partial_bytes));
    transaction.signatures[0] = operational.sign(&transaction.message_bytes).to_bytes();
    let signature = crate::x402::pubkey::encode_signature(&transaction.signatures[0]);
    ManagedTransaction {
        partial,
        signed: BASE64.encode(transaction.serialize()),
        signature,
        operational_public_key: crate::x402::pubkey::encode(&operational_key),
        transaction_sha256,
    }
}

fn configure_managed_x402(seams: &FakeSeams, operational_public_key: &str) {
    configure_x402(seams);
    seams.set_setting(
        "x402.token_mint",
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    );
    seams.set_blockchain_config(json!({
        "available": true,
        "mainWalletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "managedWallet": {
            "vaultWalletId": "00000000-0000-0000-0000-000000000001",
            "activeVersionId": "00000000-0000-0000-0000-000000000002",
            "publicKey": operational_public_key,
            "cluster": "devnet",
            "status": "active"
        },
        "treasury": {
            "provider": "squads-v4",
            "treasuryId": "00000000-0000-0000-0000-000000000003",
            "multisigAddress": "BPFLoaderUpgradeab1e11111111111111111111111",
            "vaultAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
            "cluster": "devnet",
            "threshold": 2,
            "status": "active"
        },
        "solana": { "rpcUrl": "https://rpc.example.com", "network": "devnet" }
    }));
}

#[test]
fn managed_verify_policy_signs_submits_and_confirms_only_the_returned_transaction() {
    let s = FakeSeams::new();
    let transaction = managed_transaction();
    configure_managed_x402(&s, &transaction.operational_public_key);
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 150, "currency": "USD" } }),
    );
    s.push_provider_response(json!({
        "walletId": "00000000-0000-0000-0000-000000000001",
        "walletVersionId": "00000000-0000-0000-0000-000000000002",
        "transactionSha256": transaction.transaction_sha256,
        "signedTransactionBase64": transaction.signed,
        "signature": transaction.signature,
        "policyDecisionId": "policy-decision-id",
        "signedAt": "2026-08-11T12:00:00Z"
    }));
    push_genesis(&s, "devnet");
    s.push_http_response(
        200,
        &format!(
            r#"{{"jsonrpc":"2.0","id":1,"result":"{}"}}"#,
            transaction.signature
        ),
    );
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"confirmed","err":null}]}}"#,
    );
    push_confirmed_transaction(&s, &transaction.signed, Value::Null);

    let response = handle(
        &s,
        &verify_req(json!({
            "network": "devnet",
            "payload": { "transaction": transaction.partial, "resource": "prod_1" }
        })),
    )
    .unwrap();

    assert_eq!(response.status, 200);
    assert_eq!(
        s.provider_requests.borrow()[1].0,
        ids::PROVIDER_BLOCKCHAIN_X402_SIGN
    );
    assert_eq!(
        s.provider_requests.borrow()[1].3["walletId"],
        "00000000-0000-0000-0000-000000000001"
    );
    let http_requests = s.http_requests.borrow();
    let sent_body = http_requests[1]["body"].as_str().expect("RPC request body");
    assert!(sent_body.contains(&transaction.signed));
    assert!(!sent_body.contains(&transaction.partial));
    assert!(s
        .get_entry(ids::MODEL_LEDGER, &transaction.signature)
        .is_some());
    assert!(
        s.secret_reads.borrow().is_empty(),
        "managed x402 must never request operational key material"
    );
}

#[test]
fn managed_verify_rejects_wrong_network_before_signing() {
    let s = FakeSeams::new();
    let transaction = managed_transaction();
    configure_managed_x402(&s, &transaction.operational_public_key);
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 150, "currency": "USD" } }),
    );

    let response = handle(
        &s,
        &verify_req(json!({
            "network": "mainnet-beta",
            "payload": { "transaction": transaction.partial, "resource": "prod_1" }
        })),
    )
    .unwrap();

    assert_eq!(response.status, 402);
    assert_eq!(s.provider_requests.borrow().len(), 1, "config read only");
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn verify_settles_a_confirmed_x402_payment() {
    use crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO;
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    // Product priced at $1.50 -> 1_500_000 USDC atomic, exactly the fixture amount,
    // paid to the configured wallet's ATA, with memo resource=prod_1.
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "name": "Item", "price": { "amountCents": 150, "currency": "USD" } }),
    );
    push_genesis(&s, "solana");
    // RPC: broadcast accepted ambiguously, then exact transaction confirmed.
    s.push_http_error("broadcast response lost");
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"confirmed","err":null}]}}"#,
    );
    push_confirmed_transaction(&s, TRANSFER_CHECKED_MEMO, Value::Null);

    let req = verify_req(json!({
        "x402Version": 0, "scheme": "exact", "network": "solana",
        "payload": {
            "transaction": TRANSFER_CHECKED_MEMO,
            "resource": "prod_1",
            "metadata": { "cedrosLoginUserId": "user_42" }
        }
    }));
    let resp = handle(&s, &req).unwrap();
    assert_eq!(resp.status, 200, "confirmed settlement is HTTP 200");
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["success"], true);
    let signature = out["txHash"].as_str().unwrap();
    assert!(!signature.is_empty());
    // Client reads body.signature as the tx id - must mirror txHash.
    assert_eq!(out["signature"], out["txHash"]);
    // Settlement header is present and decodes to the same result.
    assert!(resp.headers.iter().any(|(k, _)| k == "X-PAYMENT-RESPONSE"));
    // A succeeded x402 ledger row was written, keyed by the signature.
    let entry = s.get_entry(ids::MODEL_LEDGER, signature).unwrap();
    assert_eq!(entry["status"], "succeeded");
    assert_eq!(entry["provider"], "x402");
    assert_eq!(entry["grossCents"], 150);
    assert_eq!(entry["productId"], "prod_1");
    assert!(
        entry
            .get("customerProfileId")
            .and_then(Value::as_str)
            .is_none(),
        "unsigned X-PAYMENT metadata must not attribute x402 ledger rows"
    );
    // payment-succeeded(x402) analytics fired.
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    let payload = s
        .events
        .borrow()
        .iter()
        .find(|(id, _, _)| id == ids::EVENT_PAYMENT_SUCCEEDED)
        .map(|(_, _, p)| p.clone())
        .unwrap();
    assert_eq!(payload["payment_rail"], "x402");
    assert_eq!(payload["amount_cents"], 150);
    // CRM purchase event fired for the identified buyer, tagged rail=x402.
    let crm = s.crm_events.borrow();
    assert_eq!(crm.len(), 1, "x402 CRM purchase event");
    assert_eq!(crm[0].3["rail"], "x402");
    assert_eq!(crm[0].3["cedrosLoginUserId"], "user_42");
    assert_eq!(crm[0].3["productId"], "prod_1");
}

#[test]
fn verify_poll_error_after_broadcast_keeps_pending_for_reconcile() {
    use crate::reqresp::{JobExecution, JobStatus};
    use crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO;

    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 150, "currency": "USD" } }),
    );
    let resolved = requirement_for_resource(&s, "prod_1").unwrap();
    let verified = x402::verifier::verify_proof(TRANSFER_CHECKED_MEMO, &resolved.requirement)
        .expect("fixture proof is valid for prod_1");
    push_genesis(&s, "solana");
    s.push_http_error("broadcast response lost");
    s.push_http_error("getSignatureStatuses unavailable");

    let resp = handle(
        &s,
        &verify_req(json!({
            "payload": { "transaction": TRANSFER_CHECKED_MEMO, "resource": "prod_1" }
        })),
    )
    .expect("post-broadcast poll errors should return awaiting confirmation");
    assert_eq!(resp.status, 402);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["success"], false);
    assert_eq!(
        out["error"],
        "payment submitted; awaiting on-chain confirmation"
    );

    let pending = s
        .get_entry(ids::MODEL_LEDGER, &verified.signature)
        .expect("pending x402 ledger row survives poll error");
    assert_eq!(pending["status"], "pending");
    assert_eq!(pending["provider"], "x402");
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);

    push_genesis(&s, "solana");
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"finalized","err":null}]}}"#,
    );
    push_confirmed_transaction(&s, TRANSFER_CHECKED_MEMO, Value::Null);
    let outcome = crate::jobs::x402_reconcile::run(
        &s,
        &JobExecution {
            job_id: ids::JOB_X402_RECONCILE.into(),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(outcome.status, JobStatus::Succeeded);
    let settled = s.get_entry(ids::MODEL_LEDGER, &verified.signature).unwrap();
    assert_eq!(settled["status"], "succeeded");
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn verify_ignores_unsigned_metadata_for_entitlement_identity() {
    use crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO;
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 150, "currency": "USD" } }),
    );
    push_genesis(&s, "solana");
    s.push_http_error("broadcast response lost");
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"finalized","err":null}]}}"#,
    );
    push_confirmed_transaction(&s, TRANSFER_CHECKED_MEMO, Value::Null);

    let resp = handle(
        &s,
        &verify_req(json!({
            "payload": {
                "transaction": TRANSFER_CHECKED_MEMO,
                "resource": "prod_1",
                "metadata": { "cedrosLoginUserId": "attacker_user" }
            }
        })),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    let signature = out["txHash"].as_str().unwrap();
    let entry = s.get_entry(ids::MODEL_LEDGER, signature).unwrap();
    assert_eq!(entry["status"], "succeeded");
    assert!(
        entry
            .get("customerProfileId")
            .and_then(Value::as_str)
            .is_none(),
        "caller-controlled metadata must not become an entitlement identity"
    );

    let entitlement_resp = crate::routes::entitlements::handle(
        &s,
        &RouteRequest {
            route_id: ids::ROUTE_ENTITLEMENTS.into(),
            method: "POST".into(),
            path: "/entitlements/v1/check".into(),
            body: json!({
                "userId": "attacker_user",
                "checks": [{
                    "scope": "media_asset",
                    "scopeId": "asset-1",
                    "productId": "prod_1"
                }]
            })
            .to_string(),
            context_json: json!({
                "permissionClaims": [ids::CAPABILITY_ENTITLEMENT_READ],
            })
            .to_string(),
            ..Default::default()
        },
    )
    .unwrap();
    let entitlement_body: Value = serde_json::from_str(&entitlement_resp.body).unwrap();
    assert_eq!(entitlement_body["results"][0]["granted"], false);
}

#[test]
fn verify_rejects_a_proof_that_underpays() {
    use crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO;
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    // Priced at $2.00 -> 2_000_000 atomic, but the fixture only pays 1_500_000.
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 200, "currency": "USD" } }),
    );
    let req = verify_req(json!({
        "payload": { "transaction": TRANSFER_CHECKED_MEMO, "resource": "prod_1" }
    }));
    let resp = handle(&s, &req).unwrap();
    // Failure MUST be non-2xx so the client (which gates on response.ok) does
    // not unlock the resource for a rejected payment.
    assert_eq!(resp.status, 402);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["success"], false);
    assert_eq!(out["error"], "amount_too_low");
    // No ledger row, no analytics on a rejected proof.
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn verify_rejects_replay_for_a_different_ledger_resource() {
    use crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO;

    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 150, "currency": "USD" } }),
    );
    let resolved = requirement_for_resource(&s, "prod_1").unwrap();
    let verified = x402::verifier::verify_proof(TRANSFER_CHECKED_MEMO, &resolved.requirement)
        .expect("fixture proof is valid for prod_1");
    s.seed(
        ids::MODEL_LEDGER,
        &verified.signature,
        json!({
            "reference": verified.signature,
            "kind": "payment",
            "status": "succeeded",
            "grossCents": 150,
            "refundCents": 0,
            "currency": "USD",
            "productId": "prod_OTHER",
            "provider": "x402",
            "providerRef": verified.signature,
            "checkoutClaim": { "schemaVersion": 1, "fingerprint": "different-resource-claim" },
            "createdAt": "2026-06-14T00:00:00Z",
            "processedAt": "2026-06-14T00:00:00Z"
        }),
    );

    let req = verify_req(json!({
        "payload": { "transaction": TRANSFER_CHECKED_MEMO, "resource": "prod_1" }
    }));
    let error = handle(&s, &req).unwrap_err();
    assert_eq!((error.status, error.code), (409, "conflict"));
}

#[test]
fn verify_missing_header_is_a_clean_failure() {
    let s = FakeSeams::new();
    let req = RouteRequest {
        route_id: ids::ROUTE_VERIFY.into(),
        method: "POST".into(),
        path: "/paywall/v1/verify".into(),
        ..Default::default()
    };
    let resp = handle(&s, &req).unwrap();
    assert_eq!(resp.status, 402);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["success"], false);
    assert_eq!(out["error"], "missing X-PAYMENT header");
}

#[test]
fn verify_marks_on_chain_failure_failed_immediately() {
    use crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO;
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 150, "currency": "USD" } }),
    );
    let resolved = requirement_for_resource(&s, "prod_1").unwrap();
    let verified = x402::verifier::verify_proof(TRANSFER_CHECKED_MEMO, &resolved.requirement)
        .expect("fixture proof is valid for prod_1");
    push_genesis(&s, "solana");
    s.push_http_error("broadcast response lost");
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"finalized","err":{"InstructionError":[0,{"Custom":1}]}}]}}"#,
    );
    push_confirmed_transaction(
        &s,
        TRANSFER_CHECKED_MEMO,
        json!({"InstructionError":[0,{"Custom":1}]}),
    );

    let resp = handle(
        &s,
        &verify_req(json!({
            "payload": { "transaction": TRANSFER_CHECKED_MEMO, "resource": "prod_1" }
        })),
    )
    .expect("on-chain failure maps to a 402, not an Err");
    assert_eq!(resp.status, 402);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["error"], "transaction failed on-chain");

    // The row finalizes to failed right away — never left pending for reconcile.
    let row = s.get_entry(ids::MODEL_LEDGER, &verified.signature).unwrap();
    assert_eq!(row["status"], "failed");
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn verify_rejects_rpc_on_the_wrong_cluster_before_persist_or_broadcast() {
    use crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO;
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 150, "currency": "USD" } }),
    );
    push_genesis(&s, "devnet");

    let response = handle(
        &s,
        &verify_req(json!({
            "network":"solana",
            "payload":{"transaction":TRANSFER_CHECKED_MEMO,"resource":"prod_1"}
        })),
    )
    .unwrap();

    assert_eq!(response.status, 402);
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 0);
    assert_eq!(s.http_requests.borrow().len(), 1, "genesis check only");
}

#[test]
fn confirmed_signature_with_different_transaction_bytes_never_settles() {
    use crate::x402::transaction::fixtures::{TRANSFER_CHECKED, TRANSFER_CHECKED_MEMO};
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 150, "currency": "USD" } }),
    );
    let resolved = requirement_for_resource(&s, "prod_1").unwrap();
    let expected =
        x402::verifier::verify_proof(TRANSFER_CHECKED_MEMO, &resolved.requirement).unwrap();
    push_genesis(&s, "solana");
    s.push_http_error("broadcast response lost");
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"confirmed","err":null}]}}"#,
    );
    push_confirmed_transaction(&s, TRANSFER_CHECKED, Value::Null);

    let response = handle(
        &s,
        &verify_req(json!({
            "payload":{"transaction":TRANSFER_CHECKED_MEMO,"resource":"prod_1"}
        })),
    )
    .unwrap();

    assert_eq!(response.status, 402);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, &expected.signature).unwrap()["status"],
        "pending"
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn processed_payment_remains_pending() {
    use crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO;
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 150, "currency": "USD" } }),
    );
    let resolved = requirement_for_resource(&s, "prod_1").unwrap();
    let expected =
        x402::verifier::verify_proof(TRANSFER_CHECKED_MEMO, &resolved.requirement).unwrap();
    push_genesis(&s, "solana");
    s.push_http_error("broadcast response lost");
    for _ in 0..6 {
        s.push_http_response(
            200,
            r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"processed","err":null}]}}"#,
        );
    }

    let response = handle(
        &s,
        &verify_req(json!({
            "payload":{"transaction":TRANSFER_CHECKED_MEMO,"resource":"prod_1"}
        })),
    )
    .unwrap();

    assert_eq!(response.status, 402);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, &expected.signature).unwrap()["status"],
        "pending"
    );
}
