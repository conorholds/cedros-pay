use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;

const BUYER_WALLET: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const PURCHASE_SIG: &str =
    "BUguQsv2ZuHus54HAFzjdJHzZBkygAjKhEeYwSG19tUfUyvvz3worsdQCdAXDNjakJHioSiyxhFiDJrm8XpSXRA";
const REFUND_ID: &str = "refund_testfixedid0123456789abcd";

fn configure(seams: &FakeSeams) {
    seams.set_blockchain_rpc("https://rpc.example.com");
    seams.set_setting(
        "x402.token_mint",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    );
    seams.set_setting("x402.token_decimals", "6");
}

fn seed_original(seams: &FakeSeams) {
    seams.seed(
        ids::MODEL_LEDGER,
        PURCHASE_SIG,
        json!({
            "reference": PURCHASE_SIG, "kind": "payment", "status": "succeeded",
            "tokenSettlement": {"amountAtomic": 15_000_000, "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "decimals": 6},
            "grossCents": 1500, "refundCents": 0, "currency": "USD",
            "productId": "prod_widget", "customerProfileId": "buyer_42",
            "provider": "x402", "providerRef": PURCHASE_SIG,
            "payerWallet": BUYER_WALLET,
            "createdAt": "2026-06-01T00:00:00Z", "processedAt": "2026-06-01T00:00:00Z"
        }),
    );
}

fn seed_refund(seams: &FakeSeams, status: &str, signature: Option<&str>) {
    seams.seed(
        ids::MODEL_LEDGER,
        REFUND_ID,
        json!({
            "reference": REFUND_ID, "kind": "refund", "status": status,
            "grossCents": 1500, "refundCents": 0, "currency": "USD",
            "productId": "prod_widget", "customerProfileId": "buyer_42",
            "provider": "x402", "providerRef": signature,
            "settlement": {
                "transactionBase64": crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO,
                "recentBlockhash": "11111111111111111111111111111111",
                "network": "solana"
            },
            "createdAt": "2026-06-02T00:00:00Z", "processedAt": "2026-06-02T00:00:00Z",
            "originalPurchaseId": PURCHASE_SIG, "recipientWallet": BUYER_WALLET
        }),
    );
}

fn refund_signature() -> String {
    let bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO,
    )
    .unwrap();
    let parsed = crate::x402::transaction::parse(&bytes).unwrap();
    crate::x402::pubkey::encode_signature(&parsed.signatures[0])
}

fn genesis_response(seams: &FakeSeams) {
    seams.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":"5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"}"#,
    );
}

fn transaction_response(seams: &FakeSeams, error: Value) {
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":crate::x402::rpc_fixtures::transaction_result(crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO, error, crate::x402::rpc_fixtures::MERCHANT)})
        .to_string(),
    );
}

fn status_response(seams: &FakeSeams, value: Value) {
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":{"value":[value]}}).to_string(),
    );
}

// ── submitted-refund reconcile pass ────────────────────────────────────────────

fn db_of(s: &FakeSeams) -> crate::db::Db<'_, FakeSeams> {
    crate::db::Db::new(s, ids::DB_ACCESS)
}

// A submitted refund whose signature now confirms is settled (and the original marked
// refunded) by the reconcile pass — closing the "submitted forever" liveness gap.
#[test]
fn reconcile_settles_a_confirmed_submitted_refund() {
    let s = FakeSeams::new();
    configure(&s);
    seed_original(&s);
    let signature = refund_signature();
    seed_refund(&s, "submitted", Some(&signature));
    genesis_response(&s);
    status_response(&s, json!({"err": null, "confirmationStatus": "finalized"}));
    transaction_response(&s, Value::Null);

    let (settled, reset) =
        reconcile_submitted_refunds(&s, &db_of(&s), "https://rpc.example.com", 25).unwrap();
    assert_eq!((settled, reset), (1, 0));
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap()["status"],
        "succeeded"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, PURCHASE_SIG).unwrap()["status"],
        "refunded"
    );
}

// A submitted refund whose tx landed-and-failed is terminal. Rebuilding it under
// the same Core operation id is forbidden even though no tokens moved.
#[test]
fn reconcile_fails_a_failed_submitted_refund() {
    let s = FakeSeams::new();
    configure(&s);
    seed_original(&s);
    let signature = refund_signature();
    seed_refund(&s, "submitted", Some(&signature));
    genesis_response(&s);
    status_response(
        &s,
        json!({"err": {"InstructionError": [0, "Custom"]}, "confirmationStatus": "confirmed"}),
    );
    transaction_response(&s, json!({"InstructionError": [0, "Custom"]}));

    let (settled, failed) =
        reconcile_submitted_refunds(&s, &db_of(&s), "https://rpc.example.com", 25).unwrap();
    assert_eq!((settled, failed), (0, 1));
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap()["status"],
        "failed"
    );
}

// A missing observation never proves that an irreversible payout failed. Keep its
// durable signature even after a restart or long RPC outage so no later worker can
// rebuild a second transfer from the same refund request.
#[test]
fn reconcile_retains_ambiguous_signature_regardless_of_age() {
    let s = FakeSeams::new();
    configure(&s);
    seed_original(&s);
    seed_refund(&s, "submitted", Some("sig_ambiguous"));
    let mut row = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    row["createdAt"] = json!("2026-05-31T12:00:00Z");
    row["processedAt"] = json!("2026-06-03T12:00:00Z");
    s.seed(ids::MODEL_LEDGER, REFUND_ID, row);

    genesis_response(&s);
    status_response(&s, Value::Null);
    s.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":{"value":true}}).to_string(),
    );
    s.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":"sig_ambiguous"}).to_string(),
    );
    let (settled, reset) =
        reconcile_submitted_refunds(&s, &db_of(&s), "https://rpc.example.com", 25).unwrap();
    assert_eq!((settled, reset), (0, 0));
    let refund = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    assert_eq!(refund["status"], "submitted");
    assert_eq!(
        refund["providerRef"], "sig_ambiguous",
        "the only durable settlement identity must survive reconciliation"
    );
    let requests = s.http_requests.borrow();
    let rebroadcast: Value = serde_json::from_str(requests[3]["body"].as_str().unwrap()).unwrap();
    assert_eq!(rebroadcast["method"], "sendTransaction");
    assert_eq!(
        rebroadcast["params"][0],
        crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO
    );
}

#[test]
fn reconcile_preserves_unresolved_refund_without_expiry_witness() {
    let s = FakeSeams::new();
    configure(&s);
    seed_original(&s);
    seed_refund(&s, "submitted", Some("sig_expired"));
    genesis_response(&s);
    status_response(&s, Value::Null);
    s.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":{"value":false}}).to_string(),
    );

    let result =
        reconcile_submitted_refunds(&s, &db_of(&s), "https://rpc.example.com", 25).unwrap();

    assert_eq!(result, (0, 0));
    let refund = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    assert_eq!(refund["status"], "submitted");
    assert_eq!(refund["providerRef"], "sig_expired");
    assert!(refund.get("settlement").is_some());
    assert_eq!(s.http_requests.borrow().len(), 3);
}

#[test]
fn legacy_submitted_refund_without_exact_evidence_is_never_repaid() {
    let s = FakeSeams::new();
    configure(&s);
    seed_original(&s);
    seed_refund(&s, "submitted", Some("legacy_signature"));
    let mut refund = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    refund.as_object_mut().unwrap().remove("settlement");
    s.seed(ids::MODEL_LEDGER, REFUND_ID, refund);

    let result =
        reconcile_submitted_refunds(&s, &db_of(&s), "https://rpc.example.com", 25).unwrap();

    assert_eq!(result, (0, 0));
    let retained = s.get_entry(ids::MODEL_LEDGER, REFUND_ID).unwrap();
    assert_eq!(retained["status"], "submitted");
    assert_eq!(retained["providerRef"], "legacy_signature");
    assert!(s.http_requests.borrow().is_empty());
}
