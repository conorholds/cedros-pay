use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::{Signer, SigningKey};
use serde_json::{json, Value};

use super::test_support::*;
use super::*;
use crate::models::CreditAccount;
use crate::seams::HostSeams;

const OWNER: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

#[test]
fn credits_and_x402_map_to_sdk_outcomes_with_durable_replay() {
    let seams = setup();
    seams
        .secret_delete(crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT)
        .unwrap();
    seams.secret_reads.borrow_mut().clear();
    seed_credits(&seams);
    let credit_quote = quote_for(&seams, "credit-quote", "credits");
    queue_auth(&seams, "buyer-1");
    let credit_request = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        checkout_body(
            "credit-create",
            credit_quote["operationId"].as_str().unwrap(),
            "credits",
            None,
        ),
        Some("credit-create"),
        "site-a",
    );
    let credit = ok_json(handle(&seams, &credit_request).unwrap());
    assert_eq!(credit["status"], "paid");
    assert_eq!(credit["paymentMethod"], "credits");

    configure_x402(&seams);
    let x402_quote = quote_for(&seams, "x402-quote", "x402");
    let binding = &x402_quote["quote"]["x402"];
    assert_eq!(binding["network"], "solana");
    assert_eq!(binding["tokenSymbol"], "USDC");
    assert_eq!(binding["tokenMint"], MINT);
    assert_eq!(binding["amountAtomic"], 15_000_000);
    assert_eq!(binding["decimals"], 6);
    assert!(binding["memo"].as_str().unwrap().starts_with("resource="));
    assert!(binding.get("configFingerprint").is_none());
    assert!(x402_quote["quote"]["expiresAt"].as_str().is_some());
    let quote_id = x402_quote["operationId"].as_str().unwrap();
    let transaction = proof(&binding);
    let signature = signature(&transaction);
    let body = checkout_body("x402-create", quote_id, "x402", Some(&transaction));

    queue_auth(&seams, "buyer-1");
    seams.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":"5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"}"#,
    );
    seams.push_http_error("response lost");
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":[null]}}"#);
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":true}}"#);
    let first = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        body.clone(),
        Some("x402-create"),
        "site-a",
    );
    let first = ok_json(handle(&seams, &first).unwrap());
    assert_eq!(first["status"], "processing");
    assert_eq!(first["paymentMethod"], "x402");
    assert!(first["operationId"].as_str().is_some());
    assert_eq!(first["attemptId"], "attempt-1");
    assert_eq!(first["replayed"], false);

    queue_auth(&seams, "buyer-1");
    seams.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":"5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"}"#,
    );
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":signature}).to_string(),
    );
    seams.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"finalized","err":null}]}}"#,
    );
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":crate::x402::rpc_fixtures::transaction_result(&transaction, Value::Null, crate::x402::rpc_fixtures::MERCHANT)}).to_string(),
    );
    let replay = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        body,
        Some("x402-create"),
        "site-a",
    );
    let replay = ok_json(handle(&seams, &replay).unwrap());
    assert_eq!(replay["status"], "paid");
    assert_eq!(replay["paymentMethod"], "x402");
    assert_eq!(replay["operationId"], first["operationId"]);
    assert_eq!(replay["attemptId"], first["attemptId"]);
    assert_eq!(replay["replayed"], true);
    assert!(!seams.secret_reads.borrow().iter().any(|key| matches!(
        key.as_str(),
        crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT | crate::ids::SECRET_STRIPE_KEY
    )));
}

fn quote_for(seams: &crate::fake::FakeSeams, key: &str, method: &str) -> Value {
    queue_auth(seams, "buyer-1");
    let request = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        quote_body(key, json!([method])),
        Some(key),
        "site-a",
    );
    ok_json(handle(seams, &request).unwrap())
}

fn seed_credits(seams: &crate::fake::FakeSeams) {
    seams.seed(
        crate::ids::MODEL_CREDITS,
        "acct:buyer-1",
        serde_json::to_value(CreditAccount {
            subject_id: "buyer-1".into(),
            balance_cents: 100_000,
            held_cents: 0,
            currency: "USD".into(),
            updated_at: crate::time::iso8601(seams.now_unix_secs()),
        })
        .unwrap(),
    );
}

fn configure_x402(seams: &crate::fake::FakeSeams) {
    seams.set_setting("x402.enabled", "true");
    seams.set_setting("x402.payment_address", OWNER);
    seams.set_setting("x402.token_mint", MINT);
    seams.set_setting("x402.token_decimals", "6");
    seams.set_setting("x402.token_symbol", "USDC");
    seams.set_blockchain_rpc("https://rpc.example");
}

fn proof(binding: &Value) -> String {
    let signing = SigningKey::from_bytes(&[7; 32]);
    let payer = signing.verifying_key().to_bytes();
    let mint = crate::x402::pubkey::parse(binding["tokenMint"].as_str().unwrap()).unwrap();
    let dest =
        crate::x402::pubkey::parse(binding["recipientTokenAccount"].as_str().unwrap()).unwrap();
    let token = crate::x402::pubkey::parse("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap();
    let memo_program =
        crate::x402::pubkey::parse("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr").unwrap();
    let keys = [payer, mint, dest, token, memo_program];
    let mut message = vec![1, 0, 0, keys.len() as u8];
    for key in keys {
        message.extend_from_slice(&key);
    }
    message.extend_from_slice(&[9; 32]);
    message.extend_from_slice(&[2, 3, 4, 0, 1, 2, 0, 10, 12]);
    message.extend_from_slice(&binding["amountAtomic"].as_u64().unwrap().to_le_bytes());
    message.push(binding["decimals"].as_u64().unwrap() as u8);
    let memo = binding["memo"].as_str().unwrap();
    message.extend_from_slice(&[4, 0, memo.len() as u8]);
    message.extend_from_slice(memo.as_bytes());
    let mut tx = vec![1];
    tx.extend_from_slice(&signing.sign(&message).to_bytes());
    tx.extend_from_slice(&message);
    BASE64.encode(tx)
}

fn signature(transaction: &str) -> String {
    let bytes = BASE64.decode(transaction).unwrap();
    let parsed = crate::x402::transaction::parse(&bytes).unwrap();
    crate::x402::pubkey::encode_signature(&parsed.signatures[0])
}
