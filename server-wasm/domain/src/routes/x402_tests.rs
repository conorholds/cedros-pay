use super::*;
use crate::fake::FakeSeams;
use serde_json::Value;

fn req(body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_DERIVE_TOKEN_ACCOUNT.into(),
        method: "POST".into(),
        path: "/paywall/v1/derive-token-account".into(),
        body: body.to_string(),
        ..Default::default()
    }
}

#[test]
fn derives_the_canonical_ata() {
    let s = FakeSeams::new();
    let resp = handle(
        &s,
        &req(json!({
            "owner": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
            "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        })),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(
        out["tokenAccount"],
        "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B"
    );
}

#[test]
fn rejects_invalid_owner() {
    let s = FakeSeams::new();
    let err = handle(
        &s,
        &req(json!({
            "owner": "nope!",
            "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        })),
    )
    .unwrap_err();
    assert_eq!(err.status, 422);
}

fn blockhash_req() -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_BLOCKHASH.into(),
        method: "GET".into(),
        path: "/paywall/v1/blockhash".into(),
        ..Default::default()
    }
}

#[test]
fn blockhash_unconfigured_is_503() {
    let s = FakeSeams::new();
    assert_eq!(handle(&s, &blockhash_req()).unwrap_err().status, 503);
}

#[test]
fn blockhash_disabled_is_503_even_with_rpc_url() {
    let s = FakeSeams::new();
    s.set_blockchain_rpc("https://rpc.example.com");
    assert_eq!(handle(&s, &blockhash_req()).unwrap_err().status, 503);
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn blockhash_fetches_from_configured_rpc() {
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_rpc("https://rpc.example.com");
    s.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":"5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"}"#,
    );
    let blockhash = crate::x402::pubkey::encode(&[7; 32]);
    s.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":{"value":{"blockhash":blockhash,"lastValidBlockHeight":987}}}).to_string(),
    );
    let resp = handle(&s, &blockhash_req()).unwrap();
    assert_eq!(resp.status, 200);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["blockhash"], blockhash);
    assert_eq!(out["lastValidBlockHeight"], 987);
    // The outbound call hit the operator's configured RPC endpoint.
    assert_eq!(
        s.http_requests.borrow()[1]["url"],
        "https://rpc.example.com"
    );
}

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

#[test]
fn requirement_for_resource_prices_via_config_and_catalog() {
    let s = FakeSeams::new();
    configure_x402(&s);
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 1299, "currency": "USD" } }),
    );
    let resolved = requirement_for_resource(&s, "prod_1").unwrap();
    // Recipient ATA = ATA(payment_address, USDC) = the canonical KAT value.
    assert_eq!(
        resolved.requirement.recipient_token_account,
        "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B"
    );
    assert_eq!(
        resolved.requirement.token_mint,
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );
    // $12.99 -> 12_990_000 USDC atomic (exact, float-free).
    assert_eq!(resolved.requirement.min_amount_atomic, 12_990_000);
    assert_eq!(resolved.requirement.resource_id.as_deref(), Some("prod_1"));
    assert_eq!(resolved.price_cents, 1299);
}

#[test]
fn quote_returns_402_challenge_the_client_accepts() {
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_setting("x402.token_symbol", "USDC");
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "displayName": "Pro Plan", "price": { "amountCents": 1299, "currency": "USD" } }),
    );
    let req = RouteRequest {
        route_id: ids::ROUTE_QUOTE.into(),
        method: "POST".into(),
        path: "/paywall/v1/quote".into(),
        body: json!({ "resource": "prod_1", "couponCode": null }).to_string(),
        ..Default::default()
    };
    let resp = handle(&s, &req).unwrap();
    assert_eq!(resp.status, 402, "x402 challenge is HTTP 402");
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    let accept = &out["accepts"][0];
    // Every field the client's validateRequirement() requires.
    assert_eq!(accept["scheme"], "solana-spl-transfer");
    assert_eq!(accept["network"], "solana");
    assert_eq!(accept["maxAmountRequired"], "12990000"); // string, exact
    assert_eq!(accept["resource"], "prod_1");
    assert_eq!(
        accept["payTo"],
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
    );
    assert_eq!(
        accept["asset"],
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );
    assert_eq!(accept["maxTimeoutSeconds"], 300);
    assert_eq!(accept["description"], "Pro Plan");
    assert_eq!(
        accept["extra"]["recipientTokenAccount"],
        "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B"
    );
    assert_eq!(accept["extra"]["decimals"], 6);
    assert_eq!(accept["extra"]["tokenSymbol"], "USDC");
    // The wallet writes this memo verbatim; /verify requires it to bind the
    // confirmed payment to the resource (single source of truth in the verifier).
    assert!(accept["extra"]["memo"]
        .as_str()
        .is_some_and(|memo| memo.starts_with("resource=prod_1;request=")));
}

fn managed_config(status: &str, available: bool) -> Value {
    use ed25519_dalek::SigningKey;

    let operational = bs58::encode(
        SigningKey::from_bytes(&[0x11; 32])
            .verifying_key()
            .to_bytes(),
    )
    .into_string();
    json!({
        "available": available,
        "mainWalletAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        "managedWallet": {
            "vaultWalletId": "00000000-0000-0000-0000-000000000001",
            "activeVersionId": "00000000-0000-0000-0000-000000000002",
            "publicKey": operational,
            "cluster": "devnet",
            "status": status
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
        "solana": { "rpcUrl": "https://rpc.example", "network": "devnet" }
    })
}

#[test]
fn managed_quote_uses_squads_vault_and_operational_fee_payer() {
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_setting("x402.token_mint", crate::x402::config::DEVNET_USDC_MINT);
    s.set_setting(
        "x402.payment_address",
        "So11111111111111111111111111111111111111112",
    );
    s.set_blockchain_config(managed_config("active", true));
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 150, "currency": "USD" } }),
    );

    let response = handle(
        &s,
        &RouteRequest {
            route_id: ids::ROUTE_QUOTE.into(),
            method: "POST".into(),
            path: "/paywall/v1/quote".into(),
            body: json!({ "resource": "prod_1" }).to_string(),
            context_json: json!({ "requestId": "stable-quote-request" }).to_string(),
            ..Default::default()
        },
    )
    .unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();
    let accept = &body["accepts"][0];

    assert_eq!(
        accept["payTo"],
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
    );
    assert_eq!(accept["network"], "devnet");
    assert_eq!(
        accept["extra"]["feePayer"],
        managed_config("active", true)["managedWallet"]["publicKey"]
    );
}

#[test]
fn unsafe_managed_projection_disables_quote_without_legacy_fallback() {
    let s = FakeSeams::new();
    configure_x402(&s);
    s.set_blockchain_config(managed_config("rotating", false));
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 150, "currency": "USD" } }),
    );

    let error = handle(
        &s,
        &RouteRequest {
            route_id: ids::ROUTE_QUOTE.into(),
            method: "POST".into(),
            path: "/paywall/v1/quote".into(),
            body: json!({ "resource": "prod_1" }).to_string(),
            ..Default::default()
        },
    )
    .unwrap_err();

    assert_eq!((error.status, error.code), (503, "x402_unavailable"));
}

#[test]
fn quote_unconfigured_is_503() {
    let s = FakeSeams::new();
    let req = RouteRequest {
        route_id: ids::ROUTE_QUOTE.into(),
        method: "POST".into(),
        path: "/paywall/v1/quote".into(),
        body: json!({ "resource": "prod_1" }).to_string(),
        ..Default::default()
    };
    assert_eq!(handle(&s, &req).unwrap_err().status, 503);
}

#[test]
fn requirement_fails_closed_when_unconfigured_or_unknown() {
    let s = FakeSeams::new();
    // Not enabled -> 503.
    assert_eq!(
        requirement_for_resource(&s, "prod_1").unwrap_err().status,
        503
    );
    // Configured but the resource does not exist -> 404.
    configure_x402(&s);
    assert_eq!(
        requirement_for_resource(&s, "nope").unwrap_err().status,
        404
    );
}
