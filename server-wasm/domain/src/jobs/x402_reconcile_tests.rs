use super::*;
use crate::fake::FakeSeams;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

const TRANSACTION: &str = crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO;

fn transaction_signature() -> String {
    let bytes = BASE64.decode(TRANSACTION).unwrap();
    let parsed = crate::x402::transaction::parse(&bytes).unwrap();
    crate::x402::pubkey::encode_signature(&parsed.signatures[0])
}

fn push_genesis(s: &FakeSeams) {
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":"5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"}"#,
    );
}

fn push_confirmed_transaction(s: &FakeSeams, error: serde_json::Value) {
    s.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":crate::x402::rpc_fixtures::transaction_result(TRANSACTION, error, crate::x402::rpc_fixtures::MERCHANT)}).to_string(),
    );
}

fn pending_row(s: &FakeSeams, product_id: &str) -> String {
    let signature = transaction_signature();
    s.seed(
        ids::MODEL_LEDGER,
        &signature,
        json!({
            "reference": signature, "kind": "payment", "status": "pending",
            "grossCents": 150, "refundCents": 0, "currency": "USD",
            "productId": product_id, "provider": "x402", "providerRef": signature,
            "customerProfileId": "user_7",
            "checkoutClaim": { "schemaVersion": 1, "fingerprint": format!("fp:{signature}") },
            "tokenSettlement": {
                "amountAtomic": 1_500_000, "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                "decimals": 6, "transactionBase64": TRANSACTION,
                "recentBlockhash": crate::x402::pubkey::encode(&[7; 32]), "network": "solana"
            },
            "createdAt": "2026-06-01T00:00:00Z", "processedAt": "2026-06-01T00:00:00Z"
        }),
    );
    signature
}

fn exec() -> JobExecution {
    JobExecution {
        job_id: ids::JOB_X402_RECONCILE.into(),
        ..Default::default()
    }
}

#[test]
fn skips_cleanly_when_rpc_unconfigured() {
    let s = FakeSeams::new();
    let outcome = run(&s, &exec()).unwrap();
    assert_eq!(outcome.status, crate::reqresp::JobStatus::Succeeded);
}

#[test]
fn settles_an_exact_confirmed_pending_payment() {
    let s = FakeSeams::new();
    s.set_blockchain_rpc("https://rpc.example.com");
    let signature = pending_row(&s, "prod_1");
    push_genesis(&s);
    s.push_http_response(
            200,
            r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"confirmed","err":null}]}}"#,
        );
    push_confirmed_transaction(&s, serde_json::Value::Null);
    run(&s, &exec()).unwrap();
    // Row upgraded to succeeded; settlement events fired.
    let entry = s.get_entry(ids::MODEL_LEDGER, &signature).unwrap();
    assert_eq!(entry["status"], "succeeded");
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
    // CRM purchase event fired for the attributed buyer, tagged rail=x402.
    let crm = s.crm_events.borrow();
    assert_eq!(crm.len(), 1);
    assert_eq!(crm[0].3["rail"], "x402");
    assert_eq!(crm[0].3["cedrosLoginUserId"], "user_7");
}

#[test]
fn leaves_an_unconfirmed_payment_pending_without_emitting() {
    let s = FakeSeams::new();
    s.set_blockchain_rpc("https://rpc.example.com");
    let signature = pending_row(&s, "prod_1");
    push_genesis(&s);
    s.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":[null]}}"#);
    s.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":true}}"#);
    run(&s, &exec()).unwrap();
    let entry = s.get_entry(ids::MODEL_LEDGER, &signature).unwrap();
    assert_eq!(entry["status"], "pending");
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
    let requests = s.http_requests.borrow();
    let rebroadcast: serde_json::Value =
        serde_json::from_str(requests[3]["body"].as_str().unwrap()).unwrap();
    assert_eq!(rebroadcast["method"], "sendTransaction");
    assert_eq!(rebroadcast["params"][0], TRANSACTION);
}

#[test]
fn finalizing_a_cart_payment_marks_the_cart_paid() {
    const CART: &str = "cart_00112233445566778899aabbccddeeff";
    let s = FakeSeams::new();
    s.set_blockchain_rpc("https://rpc.example.com");
    let signature = pending_row(&s, &format!("cart:{CART}"));
    s.seed(
        ids::MODEL_CART,
        CART,
        json!({
            "cartId": CART, "items": [], "totalAtomic": 1_500_000u64,
            "totalCents": 150, "currency": "USD",
            "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "recipientTokenAccount": "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B",
            "paidSignature": null,
            "settlementClaim": { "schemaVersion": 1, "rail": "x402",
                "fingerprint": format!("fp:{signature}"), "reference": signature, "status": "initiating" },
            "createdAt": "2026-06-01T00:00:00Z", "expiresAt": "2026-06-01T01:00:00Z"
        }),
    );
    push_genesis(&s);
    s.push_http_response(
            200,
            r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"finalized","err":null}]}}"#,
        );
    push_confirmed_transaction(&s, serde_json::Value::Null);

    run(&s, &exec()).unwrap();

    // The settled cart is flagged paid, so the other rails' already-settled
    // guards engage even when reconcile (not /verify) finalized the payment.
    let cart = s.get_entry(ids::MODEL_CART, CART).unwrap();
    assert_eq!(cart["paidSignature"], signature);
}

#[test]
fn unwitnessed_blockhash_invalidation_keeps_payment_pending() {
    let s = FakeSeams::new();
    s.set_blockchain_rpc("https://rpc.example.com");
    let signature = pending_row(&s, "prod_1");
    push_genesis(&s);
    s.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":[null]}}"#);
    s.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":false}}"#);

    let outcome = run(&s, &exec()).unwrap();

    let details: serde_json::Value = serde_json::from_str(&outcome.details_json).unwrap();
    assert_eq!(details["expired"], 0);
    let entry = s.get_entry(ids::MODEL_LEDGER, &signature).unwrap();
    assert_eq!(entry["status"], "pending");
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn never_sweeps_x402_refund_request_rows() {
    let s = FakeSeams::new();
    s.set_blockchain_rpc("https://rpc.example.com");
    // A pending x402 refund REQUEST (kind=refund) shares status=pending +
    // provider=x402 with payments, and is seeded with an EARLIER createdAt so that,
    // without the kind filter, it would be swept first and consume the confirmation.
    s.seed(
            ids::MODEL_LEDGER,
            "refund_deadbeefdeadbeefdeadbeefdeadbeef",
            json!({
                "reference": "refund_deadbeefdeadbeefdeadbeefdeadbeef",
                "kind": "refund", "status": "pending", "grossCents": 1500,
                "refundCents": 0, "currency": "USD", "provider": "x402",
                "originalPurchaseId": "sig_paid", "recipientWallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                "createdAt": "2026-05-01T00:00:00Z", "processedAt": "2026-05-01T00:00:00Z"
            }),
        );
    let signature = pending_row(&s, "prod_1"); // kind=payment, createdAt 2026-06-01 (later)
    push_genesis(&s);
    s.push_http_response(
            200,
            r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"finalized","err":null}]}}"#,
        );
    push_confirmed_transaction(&s, serde_json::Value::Null);

    run(&s, &exec()).unwrap();

    // The payment is finalized; the refund row is untouched (never queried).
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, &signature).unwrap()["status"],
        "succeeded"
    );
    let refund = s
        .get_entry(ids::MODEL_LEDGER, "refund_deadbeefdeadbeefdeadbeefdeadbeef")
        .unwrap();
    assert_eq!(refund["status"], "pending", "refund row must not be swept");
    // Exactly one RPC call (the payment signature), not the refund id.
    assert_eq!(s.http_requests.borrow().len(), 3);
}

#[test]
fn marks_a_failed_transaction_failed() {
    let s = FakeSeams::new();
    s.set_blockchain_rpc("https://rpc.example.com");
    let signature = pending_row(&s, "prod_1");
    push_genesis(&s);
    s.push_http_response(
            200,
            r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"finalized","err":{"InstructionError":[0,"Custom"]}}]}}"#,
        );
    push_confirmed_transaction(&s, json!({"InstructionError":[0,"Custom"]}));
    run(&s, &exec()).unwrap();
    let entry = s.get_entry(ids::MODEL_LEDGER, &signature).unwrap();
    assert_eq!(entry["status"], "failed");
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn old_unverifiable_payment_cannot_starve_later_finalized_payment() {
    let s = FakeSeams::new();
    s.set_blockchain_rpc("https://rpc.example.com");
    s.seed(
        ids::MODEL_LEDGER,
        "legacy",
        json!({
            "reference":"legacy", "kind":"payment", "provider":"x402", "status":"pending",
            "grossCents":150, "currency":"USD", "createdAt":"2020-01-01T00:00:00Z"
        }),
    );
    let signature = pending_row(&s, "prod_1");
    let mut execution = exec();
    execution.metadata_json = json!({"batchSize":1}).to_string();
    run(&s, &execution).unwrap();
    assert!(s.http_requests.borrow().is_empty());
    push_genesis(&s);
    s.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"finalized","err":null}]}}"#);
    push_confirmed_transaction(&s, serde_json::Value::Null);
    run(&s, &execution).unwrap();
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, &signature).unwrap()["status"],
        "succeeded"
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "legacy").unwrap()["status"],
        "pending"
    );
}
