use super::*;
use crate::fake::FakeSeams;
use base64::Engine as _;

const MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEST_ATA: &str = "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B";
const PAY_TO: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

fn configure_x402(s: &FakeSeams) {
    s.set_setting("x402.enabled", "true");
    s.set_setting("x402.payment_address", PAY_TO);
    s.set_setting("x402.token_mint", MINT);
    s.set_setting("x402.token_decimals", "6");
}

fn quote_req(body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_CART_QUOTE.into(),
        method: "POST".into(),
        path: "/paywall/v1/cart/quote".into(),
        body: body.to_string(),
        ..Default::default()
    }
}

/// Seeds two priced catalog products. A cart of `prod_a` ×1 ($12.99) +
/// `prod_b` ×2 ($1.50) totals 15_990_000 atomic / 1599 cents.
fn seed_catalog(s: &FakeSeams) {
    s.seed(
        ids::MODEL_CATALOG,
        "prod_a",
        json!({ "id": "prod_a", "price": { "amountCents": 1299, "currency": "USD" } }),
    );
    s.seed(
        ids::MODEL_CATALOG,
        "prod_b",
        json!({ "id": "prod_b", "price": { "amountCents": 150, "currency": "USD" } }),
    );
}

fn two_item_cart() -> Value {
    json!({ "items": [
        { "resource": "prod_a", "quantity": 1 },
        { "resource": "prod_b", "quantity": 2 }
    ]})
}

#[test]
fn cart_quote_prices_and_stores_the_snapshot() {
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_setting("x402.token_symbol", "USDC");
    seed_catalog(&s);

    let resp = handle(&s, &quote_req(two_item_cart())).unwrap();
    assert_eq!(resp.status, 200);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    let cart_id = out["cartId"].as_str().unwrap();
    assert!(is_valid_cart_id(cart_id), "cartId must be cart_<32 hex>");
    // Exact summed atomic, float-free: 12_990_000 + 2×1_500_000.
    assert_eq!(out["quote"]["maxAmountRequired"], "15990000");
    assert_eq!(out["totalAmount"], "15.990000");
    assert_eq!(out["quote"]["resource"], format!("cart:{cart_id}"));
    assert_eq!(out["quote"]["scheme"], "solana-spl-transfer");
    assert_eq!(out["quote"]["payTo"], PAY_TO);
    assert_eq!(out["quote"]["asset"], MINT);
    assert_eq!(out["quote"]["maxTimeoutSeconds"], 900);
    // The memo binds the proof to this cart — the verifier requires it.
    assert_eq!(
        out["quote"]["extra"]["memo"],
        format!("resource=cart:{cart_id}")
    );
    assert_eq!(out["quote"]["extra"]["recipientTokenAccount"], DEST_ATA);
    assert_eq!(out["metadata"]["item_count"], 2);
    assert_eq!(out["metadata"]["total_quantity"], 3);
    // The snapshot was persisted for /verify.
    let row = s.get_entry(ids::MODEL_CART, cart_id).unwrap();
    assert_eq!(row["totalAtomic"], 15_990_000);
    assert_eq!(row["totalCents"], 1599);
    assert_eq!(row["tokenMint"], MINT);
    assert_eq!(row["recipientTokenAccount"], DEST_ATA);
}

#[test]
fn cart_quote_rejects_invalid_carts() {
    let s = FakeSeams::new();
    configure_x402(&s);
    seed_catalog(&s);

    // Empty cart → 422.
    assert_eq!(
        handle(&s, &quote_req(json!({ "items": [] })))
            .unwrap_err()
            .status,
        422
    );
    // Quantity 0 → 422.
    assert_eq!(
        handle(
            &s,
            &quote_req(json!({ "items": [{ "resource": "prod_a", "quantity": 0 }] }))
        )
        .unwrap_err()
        .status,
        422
    );
    // Quantity over the cap → 422.
    assert_eq!(
        handle(
            &s,
            &quote_req(json!({ "items": [{ "resource": "prod_a", "quantity": 10001 }] }))
        )
        .unwrap_err()
        .status,
        422
    );
    // Unknown resource → 404.
    assert_eq!(
        handle(
            &s,
            &quote_req(json!({ "items": [{ "resource": "nope", "quantity": 1 }] }))
        )
        .unwrap_err()
        .status,
        404
    );
}

#[test]
fn cart_quote_caps_item_count() {
    let s = FakeSeams::new();
    configure_x402(&s);
    seed_catalog(&s);
    let items: Vec<Value> = (0..101)
        .map(|_| json!({ "resource": "prod_a", "quantity": 1 }))
        .collect();
    assert_eq!(
        handle(&s, &quote_req(json!({ "items": items })))
            .unwrap_err()
            .status,
        422
    );
}

// ── /verify cart settlement (self-contained signed fixture) ──────────────

/// Build a base64 signed TransferChecked + Memo transaction the verifier
/// accepts, paying `amount` to the canonical recipient ATA with the cart's
/// resource-binding memo. Uses the crate's own pubkey/ed25519 primitives so
/// the fixture needs no external solana-sdk oracle.
fn build_cart_proof(cart_id: &str, amount: u64) -> String {
    use crate::x402::pubkey;
    use ed25519_dalek::{Signer, SigningKey};

    let signing = SigningKey::from_bytes(&[7u8; 32]);
    let payer = signing.verifying_key().to_bytes();
    let mint = pubkey::parse(MINT).unwrap();
    let dest = pubkey::parse(DEST_ATA).unwrap();
    let token_program = pubkey::parse("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap();
    let memo_program = pubkey::parse("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr").unwrap();
    // keys: [payer/source/owner, mint, dest, token_program, memo_program]
    let keys = [payer, mint, dest, token_program, memo_program];

    let mut msg = vec![1u8, 0, 0]; // header (only the signer count is meaningful)
    msg.push(keys.len() as u8);
    for k in &keys {
        msg.extend_from_slice(k);
    }
    msg.extend_from_slice(&[0u8; 32]); // recent blockhash (unused offline)
    msg.push(2); // two instructions
                 // ix0: TransferChecked — accounts [source, mint, dest, owner].
    msg.push(3); // program_id_index → token program
    let accts: [u8; 4] = [0, 1, 2, 0];
    msg.push(accts.len() as u8);
    msg.extend_from_slice(&accts);
    let mut data = vec![12u8];
    data.extend_from_slice(&amount.to_le_bytes());
    data.push(6); // decimals
    msg.push(data.len() as u8);
    msg.extend_from_slice(&data);
    // ix1: Memo — program index 4, no accounts, the resource-binding payload.
    msg.push(4);
    msg.push(0);
    let memo = x402::verifier::expected_memo(&format!("cart:{cart_id}"));
    msg.push(memo.len() as u8);
    msg.extend_from_slice(memo.as_bytes());

    let sig = signing.sign(&msg).to_bytes();
    let mut tx = vec![1u8]; // one signature
    tx.extend_from_slice(&sig);
    tx.extend_from_slice(&msg);
    base64::engine::general_purpose::STANDARD.encode(tx)
}

fn verify_req(cart_id: &str, proof: &str) -> RouteRequest {
    let x_payment = json!({
        "network": "solana",
        "payload": { "transaction": proof, "resource": format!("cart:{cart_id}") }
    });
    let header = base64::engine::general_purpose::STANDARD.encode(x_payment.to_string());
    RouteRequest {
        route_id: ids::ROUTE_VERIFY.into(),
        method: "POST".into(),
        path: "/paywall/v1/verify".into(),
        headers: vec![("x-payment".into(), header)],
        ..Default::default()
    }
}

fn seed_pending_cart(s: &FakeSeams, cart_id: &str, total_atomic: u64, total_cents: i64) {
    let now = s.now_unix_secs();
    let row = CartRow {
        cart_id: cart_id.to_string(),
        items: vec![CartLine {
            resource: "prod_a".into(),
            variant_id: None,
            quantity: 1,
            line_atomic: total_atomic,
            line_cents: total_cents,
        }],
        total_atomic,
        total_cents,
        original_total_atomic: None,
        original_total_cents: None,
        applied_coupon: None,
        currency: "USD".into(),
        token_mint: MINT.into(),
        token_decimals: 6,
        recipient_token_account: DEST_ATA.into(),
        paid_signature: None,
        settlement_claim: None,
        created_at: time::iso8601(now),
        expires_at: time::iso8601(now + CART_QUOTE_TTL_SECONDS),
    };
    s.seed(
        ids::MODEL_CART,
        cart_id,
        serde_json::to_value(&row).unwrap(),
    );
}

#[test]
fn verify_settles_a_confirmed_cart_payment() {
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    let cart_id = "cart_00112233445566778899aabbccddeeff";
    seed_pending_cart(&s, cart_id, 15_990_000, 1599);
    let proof = build_cart_proof(cart_id, 15_990_000);
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":"5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"}"#,
    );
    s.push_http_error("broadcast response lost");
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"confirmed","err":null}]}}"#,
    );
    s.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":crate::x402::rpc_fixtures::transaction_result(&proof, serde_json::Value::Null, crate::x402::rpc_fixtures::MERCHANT)}).to_string(),
    );

    let resp = crate::routes::x402::handle(&s, &verify_req(cart_id, &proof)).unwrap();
    assert_eq!(resp.status, 200, "confirmed cart settlement is HTTP 200");
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["success"], true);
    let signature = out["txHash"].as_str().unwrap();
    // The cart's ledger row is recorded under the signature, attributed to the cart.
    let entry = s.get_entry(ids::MODEL_LEDGER, signature).unwrap();
    assert_eq!(entry["status"], "succeeded");
    assert_eq!(entry["provider"], "x402");
    assert_eq!(entry["grossCents"], 1599);
    assert_eq!(entry["productId"], format!("cart:{cart_id}"));
    // The cart is flagged paid with the settling signature.
    let cart = s.get_entry(ids::MODEL_CART, cart_id).unwrap();
    assert_eq!(cart["paidSignature"], signature);
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn verify_rejects_a_cart_proof_that_overpays_the_total() {
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    let cart_id = "cart_aabbccddeeff00112233445566778899";
    // Stored total is one atomic unit below the proof amount → exact-total fails.
    seed_pending_cart(&s, cart_id, 15_989_999, 1599);
    let proof = build_cart_proof(cart_id, 15_990_000);

    let resp = crate::routes::x402::handle(&s, &verify_req(cart_id, &proof)).unwrap();
    assert_eq!(resp.status, 402, "carts require exact-to-total payment");
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["success"], false);
    assert_eq!(out["error"], "amount_mismatch");
    // No ledger row, no analytics on a rejected cart proof.
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn verify_rejects_an_expired_cart() {
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    let cart_id = "cart_ffeeddccbbaa99887766554433221100";
    seed_pending_cart(&s, cart_id, 15_990_000, 1599);
    // Advance the clock past the cart TTL.
    s.set_now(s.now_unix_secs() + CART_QUOTE_TTL_SECONDS + 1);
    let proof = build_cart_proof(cart_id, 15_990_000);

    let resp = crate::routes::x402::handle(&s, &verify_req(cart_id, &proof)).unwrap();
    assert_eq!(resp.status, 402);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["success"], false);
    assert!(
        out["error"].as_str().unwrap().contains("expired"),
        "expired cart must be rejected, got {}",
        out["error"]
    );
}

#[test]
fn unknown_cart_id_is_not_found() {
    let s = FakeSeams::new();
    // Valid format but no stored row → 404 (the DB-miss path).
    let err =
        cart_requirement_from_stored(&s, "cart_00000000000000000000000000000000", 0).unwrap_err();
    assert_eq!(err.status, 404);
    // Malformed id is rejected before any DB read.
    let bad = cart_requirement_from_stored(&s, "not-a-cart-id", 0).unwrap_err();
    assert_eq!(bad.status, 404);
}

fn get_req(cart_id: &str) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_CART_GET.into(),
        method: "GET".into(),
        path: format!("/paywall/v1/cart/{cart_id}"),
        ..Default::default()
    }
}

#[test]
fn cart_get_reports_pending_then_paid() {
    let s = FakeSeams::new();
    configure_x402(&s);
    let cart_id = "cart_00112233445566778899aabbccddeeff";
    seed_pending_cart(&s, cart_id, 15_990_000, 1599);

    let out: Value = serde_json::from_str(&handle(&s, &get_req(cart_id)).unwrap().body).unwrap();
    assert_eq!(out["cartId"], cart_id);
    assert_eq!(out["status"], "pending");
    assert_eq!(out["totalAmount"], "15.990000");
    assert_eq!(out["token"], MINT);
    assert_eq!(out["paidSignature"], Value::Null);

    // After settlement the same read reports paid with the signature.
    crate::routes::cart_settlement::mark_paid(&Db::new(&s, ids::DB_ACCESS), cart_id, "sig_123")
        .unwrap();
    let paid: Value = serde_json::from_str(&handle(&s, &get_req(cart_id)).unwrap().body).unwrap();
    assert_eq!(paid["status"], "paid");
    assert_eq!(paid["paidSignature"], "sig_123");
}

#[test]
fn cart_get_unknown_or_malformed_is_404() {
    let s = FakeSeams::new();
    // Valid format, no stored row.
    assert_eq!(
        handle(&s, &get_req("cart_00000000000000000000000000000000"))
            .unwrap_err()
            .status,
        404
    );
    // Malformed id is rejected before the DB read.
    assert_eq!(handle(&s, &get_req("bogus")).unwrap_err().status, 404);
}
