use super::*;
use crate::fake::FakeSeams;
use serde_json::Value;

const NOW: i64 = 1_800_000_000;
const SUBSCRIBER_SEED: [u8; 32] = [0x22; 32];
const MERCHANT: &str = "8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR";
const MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const OTHER: &str = "11111111111111111111111111111111";

fn configure_login(s: &FakeSeams, user_id: &str) {
    s.set_setting("cedros_login.base_url", "https://site.example");
    s.push_http_response(200, &format!(r#"{{"user":{{"id":"{user_id}"}}}}"#));
}

fn set_settings(s: &FakeSeams) {
    s.set_now(NOW);
    s.set_blockchain_config(json!({"solana":{"rpcUrl":"https://rpc.example","network":"mainnet-beta","rpcSecretConfigured":true}}));
    s.set_setting(
        "subscriptions.settings",
        &json!({
            "enabled": true,
            "plans": [{
                "id": "pro", "title": "Pro", "description": "Paid access",
                "priceMonthlyUsd": 12, "priceAnnualUsd": 99,
                "isActive": true, "sortOrder": 1,
                "solanaSubscription": {
                    "enabled": true, "planId": 7, "merchantAddress": MERCHANT,
                    "collectorAddress": collector_address(),
                    "tokenMint": MINT, "monthlyAmountAtomic": 12000000,
                    "monthlyPeriodHours": 720
                }
            }]
        })
        .to_string(),
    );
}

fn req(route_id: &str, method: &str, path: &str) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        headers: vec![("authorization".into(), "Bearer user-token".into())],
        ..Default::default()
    }
}

fn body(resp: &RouteResponse) -> Value {
    serde_json::from_str(&resp.body).unwrap()
}

#[test]
fn confirmed_initial_collection_activates_and_selection_status_completes() {
    let s = FakeSeams::new();
    let terms = prepare_terms(&s);
    queue_valid_proofs(&s, &terms);
    let response = activate(&s, &terms).unwrap();
    let activated = body(&response);

    assert_eq!(activated["status"], "active");
    assert_eq!(activated["paymentMethod"], "solana_subscription");
    assert_eq!(activated["solana"]["paymentsCollected"], 1);
    assert_eq!(
        activated["solana"]["initialPaymentSignature"],
        valid_signature(8)
    );
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 2);
    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 1);
    assert_eq!(s.entry_count(ids::MODEL_WEBHOOK_OUTBOX), 2);
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_STARTED), 1);

    configure_login(&s, "user_1");
    let mut status = req(
        ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
        "GET",
        "/paywall/v1/subscription/selection-status",
    );
    status.query = vec![("userId".into(), "user_1".into())];
    let selected = body(&handle(&s, &status).unwrap());
    assert_eq!(selected["complete"], true);
    assert_eq!(selected["status"], "active");
    assert_eq!(selected["paymentMethod"], "solana_subscription");
}

#[test]
fn same_payment_signature_replays_without_duplicate_writes_or_events() {
    let s = FakeSeams::new();
    let terms = prepare_terms(&s);
    queue_valid_proofs(&s, &terms);
    let first = body(&activate(&s, &terms).unwrap());
    queue_valid_proofs(&s, &terms);
    let second = body(&activate(&s, &terms).unwrap());

    assert_eq!(second["subscriptionId"], first["subscriptionId"]);
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 2);
    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 1);
    assert_eq!(s.entry_count(ids::MODEL_WEBHOOK_OUTBOX), 2);
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_STARTED), 1);
}

#[test]
fn activation_without_pay_owned_collection_grants_nothing() {
    let s = FakeSeams::new();
    let terms = prepare_terms(&s);
    configure_login(&s, "user_1");

    let error = activate(&s, &terms).unwrap_err();
    assert_eq!(error.status, 409);
    assert_eq!(error.code, "collection_required");
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 0);
    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 0);
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_STARTED), 0);
}

#[test]
fn unfinalized_payment_is_retryable_and_grants_nothing() {
    let s = FakeSeams::new();
    let terms = prepare_terms(&s);
    seed_finalized_collection(&s, &terms);
    configure_login(&s, "user_1");
    queue_authorization_proof(&s, &terms);
    status_response(&s, "confirmed");

    let error = activate(&s, &terms).unwrap_err();
    assert_eq!(error.status, 409);
    assert_eq!(error.code, "transaction_not_finalized");
    assert_no_activation(&s);
}

#[test]
fn onchain_plan_end_may_shorten_but_never_extend_the_paid_period() {
    let s = FakeSeams::new();
    let terms = prepare_terms(&s);
    seed_finalized_collection(&s, &terms);
    configure_login(&s, "user_1");
    queue_authorization_proof(&s, &terms);
    status_response(&s, "finalized");
    s.push_http_response(
        200,
        &rpc_result(payment_transaction(&terms, Mutation::ShortPeriod)).to_string(),
    );
    assert_eq!(body(&activate(&s, &terms).unwrap())["status"], "active");
}

#[test]
fn wrong_payment_facts_never_create_records_or_events() {
    for mutation in [
        Mutation::Amount,
        Mutation::Receiver,
        Mutation::Program,
        Mutation::Plan,
        Mutation::Buyer,
        Mutation::Mint,
        Mutation::Period,
    ] {
        let s = FakeSeams::new();
        let terms = prepare_terms(&s);
        seed_finalized_collection(&s, &terms);
        configure_login(&s, "user_1");
        queue_authorization_proof(&s, &terms);
        status_response(&s, "finalized");
        s.push_http_response(
            200,
            &rpc_result(payment_transaction(&terms, mutation)).to_string(),
        );

        let error = activate(&s, &terms).unwrap_err();
        assert_eq!(error.status, 422, "{mutation:?}");
        assert_eq!(error.code, "invalid_payment_proof", "{mutation:?}");
        assert_no_activation(&s);
    }
}

#[test]
fn rpc_outage_and_atomic_write_failure_never_grant_access() {
    let outage = FakeSeams::new();
    let outage_terms = prepare_terms(&outage);
    seed_finalized_collection(&outage, &outage_terms);
    configure_login(&outage, "user_1");
    outage.push_http_error("RPC unavailable");
    let rpc_error = activate(&outage, &outage_terms).unwrap_err();
    assert_eq!(rpc_error.status, 502);
    assert_eq!(rpc_error.code, "rpc_error");
    assert_no_activation(&outage);

    let conflict = FakeSeams::new();
    let conflict_terms = prepare_terms(&conflict);
    queue_valid_proofs(&conflict, &conflict_terms);
    conflict.fail_next_guarded_batch_after(2);
    assert!(activate(&conflict, &conflict_terms).is_err());
    assert_no_activation(&conflict);

    queue_valid_proofs(&conflict, &conflict_terms);
    assert_eq!(
        body(&activate(&conflict, &conflict_terms).unwrap())["status"],
        "active"
    );
}

fn prepare_terms(s: &FakeSeams) -> Value {
    set_settings(s);
    configure_login(s, "user_1");
    s.push_http_response(200, r#"{"discount":null}"#);
    let mut request = req(
        ids::ROUTE_SUBSCRIPTION_PLAN_SOLANA_SUBSCRIPTION,
        "POST",
        "/paywall/v1/subscription/plan/solana-subscription",
    );
    request.body = json!({
        "planId": "pro", "interval": "monthly", "wallet": subscriber(),
        "numberOfPayments": 6
    })
    .to_string();
    body(&handle(s, &request).unwrap())
}

fn activate(s: &FakeSeams, terms: &Value) -> AppResult<RouteResponse> {
    activate_with_payment(s, terms, &valid_signature(8))
}

fn activate_with_payment(
    s: &FakeSeams,
    terms: &Value,
    payment_signature: &str,
) -> AppResult<RouteResponse> {
    let authorization_signature = valid_signature(7);
    let mut request = req(
        ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_ACTIVATE,
        "POST",
        "/paywall/v1/subscription/solana-subscription/activate",
    );
    request.body = json!({
        "planId": "pro", "interval": "monthly", "wallet": terms["wallet"],
        "authorizationSignature": authorization_signature,
        "paymentSignature": payment_signature,
        "walletBindingMessage": wallet_binding_message(terms, &authorization_signature),
        "walletBindingSignature": wallet_binding_signature(terms, &authorization_signature),
        "subscriptionAddress": terms["subscriptionAddress"],
        "subscriptionAuthorityAddress": terms["subscriptionAuthorityAddress"],
        "planAddress": terms["planAddress"], "numberOfPayments": 6,
        "metadata": { "campaign": "launch" }
    })
    .to_string();
    handle(s, &request)
}

fn queue_valid_proofs(s: &FakeSeams, terms: &Value) {
    seed_finalized_collection(s, terms);
    configure_login(s, "user_1");
    queue_authorization_proof(s, terms);
    status_response(s, "finalized");
    s.push_http_response(
        200,
        &rpc_result(payment_transaction(terms, Mutation::None)).to_string(),
    );
}

fn seed_finalized_collection(s: &FakeSeams, terms: &Value) {
    let authorization_signature = valid_signature(7);
    let facts = solana_collection_store::CollectionFacts {
        user_id: "user_1",
        plan_id: "pro",
        interval: "monthly",
        wallet: terms["wallet"].as_str().unwrap(),
        authorization_signature: &authorization_signature,
        wallet_binding_message: &wallet_binding_message(terms, &authorization_signature),
        wallet_binding_signature: &wallet_binding_signature(terms, &authorization_signature),
        subscription_address: terms["subscriptionAddress"].as_str().unwrap(),
    };
    if solana_collection_store::load(s, &facts).unwrap().is_some() {
        return;
    }
    let prepared = solana_collection_transaction::PreparedCollection {
        signed_transaction: "persisted-signed-transaction".into(),
        signature: valid_signature(8),
        blockhash: OTHER.into(),
    };
    let stored = solana_collection_store::claim(s, &facts, &prepared).unwrap();
    solana_collection_store::mark(s, &stored, "finalized").unwrap();
}

fn queue_authorization_proof(s: &FakeSeams, terms: &Value) {
    status_response(s, "finalized");
    s.push_http_response(
        200,
        &rpc_result(authorization_transaction(terms)).to_string(),
    );
}

fn status_response(s: &FakeSeams, status: &str) {
    s.push_http_response(
        200,
        &rpc_result(json!("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d")).to_string(),
    );
    s.push_http_response(
        200,
        &rpc_result(json!({
            "value": [{ "confirmationStatus": status, "err": null }]
        }))
        .to_string(),
    );
}

fn authorization_transaction(terms: &Value) -> Value {
    json!({
        "slot": 100, "blockTime": NOW - 120,
        "transaction": { "signatures": [valid_signature(7)], "message": {
            "header": {
                "numRequiredSignatures": 1,
                "numReadonlySignedAccounts": 0,
                "numReadonlyUnsignedAccounts": 6
            },
            "accountKeys": [
                terms["wallet"], terms["subscriptionAddress"], terms["merchantAddress"],
                terms["planAddress"], terms["subscriptionAuthorityAddress"], OTHER,
                terms["eventAuthorityAddress"], terms["programAddress"]
            ],
            "instructions": [{
                "programIdIndex": 7, "accounts": [0,2,3,1,4,5,6,7],
                "data": subscribe_data(terms)
            }]
        }},
        "meta": { "err": null, "innerInstructions": [], "loadedAddresses": null }
    })
}

#[derive(Clone, Copy, Debug)]
enum Mutation {
    None,
    Amount,
    Receiver,
    Program,
    Plan,
    Buyer,
    Mint,
    Period,
    ShortPeriod,
}

fn payment_transaction(terms: &Value, mutation: Mutation) -> Value {
    let receiver = receiver_account(terms);
    let program = if matches!(mutation, Mutation::Program) {
        OTHER
    } else {
        terms["programAddress"].as_str().unwrap()
    };
    let plan = if matches!(mutation, Mutation::Plan) {
        OTHER
    } else {
        terms["planAddress"].as_str().unwrap()
    };
    let buyer = if matches!(mutation, Mutation::Buyer) {
        OTHER
    } else {
        terms["wallet"].as_str().unwrap()
    };
    let mint = if matches!(mutation, Mutation::Mint) {
        OTHER
    } else {
        terms["tokenMint"].as_str().unwrap()
    };
    let receiver_ix = if matches!(mutation, Mutation::Receiver) {
        OTHER
    } else {
        receiver.as_str()
    };
    let amount =
        terms["amountAtomic"].as_u64().unwrap() + u64::from(matches!(mutation, Mutation::Amount));
    let token_balance = |index: u64, owner: &str, amount: u64| {
        json!({
            "accountIndex":index,"owner":owner,"mint":terms["tokenMint"],"programId":terms["tokenProgramAddress"],
            "uiTokenAmount":{"amount":amount.to_string(),"decimals":6}
        })
    };
    json!({
        "slot": 101, "blockTime": NOW,
        "transaction": { "signatures": [valid_signature(8)], "message": {
            "header": {
                "numRequiredSignatures": 1,
                "numReadonlySignedAccounts": 1,
                "numReadonlyUnsignedAccounts": 6
            },
            "accountKeys": [
                terms["collectorAddress"], terms["subscriptionAddress"],
                terms["subscriberTokenAccount"], receiver_ix, plan,
                terms["subscriptionAuthorityAddress"], mint,
                terms["tokenProgramAddress"], terms["eventAuthorityAddress"], program
            ],
            "instructions": [{
                "programIdIndex": 9, "accounts": [1,4,5,2,3,0,6,7,8,9],
                "data": transfer_data(amount, buyer, mint)
            }]
        }},
        "meta": {
            "err": null, "loadedAddresses": null,
            "preTokenBalances":[token_balance(2,terms["wallet"].as_str().unwrap(),amount),token_balance(3,MERCHANT,0)],
            "postTokenBalances":[token_balance(2,terms["wallet"].as_str().unwrap(),0),token_balance(3,MERCHANT,amount)],
            "innerInstructions": [{ "index": 0, "instructions": [{
                "programIdIndex": 9, "accounts": [8],
                "data": transfer_event(terms, &receiver, mutation)
            }] }]
        }
    })
}

fn subscribe_data(terms: &Value) -> String {
    let mut data = vec![0u8; 74];
    data[0] = 11;
    data[1..9].copy_from_slice(&terms["solanaPlanId"].as_u64().unwrap().to_le_bytes());
    data[9] = terms["planBump"].as_u64().unwrap() as u8;
    data[10..42].copy_from_slice(&pubkey_bytes(terms["tokenMint"].as_str().unwrap()));
    data[42..50].copy_from_slice(&terms["amountAtomic"].as_u64().unwrap().to_le_bytes());
    data[50..58].copy_from_slice(&terms["periodHours"].as_u64().unwrap().to_le_bytes());
    data[58..66].copy_from_slice(&123i64.to_le_bytes());
    data[66..74].copy_from_slice(&456i64.to_le_bytes());
    bs58::encode(data).into_string()
}

fn transfer_data(amount: u64, buyer: &str, mint: &str) -> String {
    let mut data = vec![10u8];
    data.extend_from_slice(&amount.to_le_bytes());
    data.extend_from_slice(&pubkey_bytes(buyer));
    data.extend_from_slice(&pubkey_bytes(mint));
    bs58::encode(data).into_string()
}

fn transfer_event(terms: &Value, receiver: &str, mutation: Mutation) -> String {
    let start = NOW - 60;
    let period_adjustment = match mutation {
        Mutation::Period => 1,
        Mutation::ShortPeriod => -3600,
        _ => 0,
    };
    let end = start + terms["periodHours"].as_i64().unwrap() * 3600 + period_adjustment;
    let amount = terms["amountAtomic"].as_u64().unwrap();
    let mut data = 0x1d9acb512ea545e4u64.to_le_bytes().to_vec();
    data.push(2);
    for address in [
        terms["subscriptionAddress"].as_str().unwrap(),
        terms["planAddress"].as_str().unwrap(),
        terms["wallet"].as_str().unwrap(),
        terms["tokenMint"].as_str().unwrap(),
    ] {
        data.extend_from_slice(&pubkey_bytes(address));
    }
    data.extend_from_slice(&amount.to_le_bytes());
    data.extend_from_slice(&start.to_le_bytes());
    data.extend_from_slice(&end.to_le_bytes());
    data.extend_from_slice(&amount.to_le_bytes());
    data.extend_from_slice(&pubkey_bytes(MERCHANT));
    data.extend_from_slice(&pubkey_bytes(receiver));
    data.extend_from_slice(&pubkey_bytes(terms["collectorAddress"].as_str().unwrap()));
    bs58::encode(data).into_string()
}

fn receiver_account(terms: &Value) -> String {
    let merchant = crate::x402::pubkey::parse(MERCHANT).unwrap();
    let mint = crate::x402::pubkey::parse(MINT).unwrap();
    let token = crate::x402::pubkey::parse(terms["tokenProgramAddress"].as_str().unwrap()).unwrap();
    solana::ata_for_token_program(&merchant, &mint, &token)
}

fn assert_no_activation(s: &FakeSeams) {
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 1);
    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 0);
    assert_eq!(s.entry_count(ids::MODEL_WEBHOOK_OUTBOX), 0);
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_STARTED), 0);
}

fn collector_address() -> String {
    use ed25519_dalek::SigningKey;

    bs58::encode(
        SigningKey::from_bytes(&[0x11u8; 32])
            .verifying_key()
            .to_bytes(),
    )
    .into_string()
}

fn subscriber() -> String {
    let signing = ed25519_dalek::SigningKey::from_bytes(&SUBSCRIBER_SEED);
    bs58::encode(signing.verifying_key().to_bytes()).into_string()
}

fn pubkey_bytes(address: &str) -> [u8; 32] {
    crate::x402::pubkey::parse(address).unwrap()
}

fn valid_signature(seed: u8) -> String {
    bs58::encode([seed; 64]).into_string()
}

fn rpc_result(result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": 1, "result": result })
}

include!("subscription_selection_solana_collection_tests.rs");

#[test]
fn subscription_rejects_wrong_network_and_missing_or_forged_payment_effects() {
    let seams = FakeSeams::new();
    let terms = prepare_terms(&seams);
    seed_finalized_collection(&seams, &terms);
    configure_login(&seams, "user_1");
    seams.push_http_response(
        200,
        &rpc_result(json!("EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG")).to_string(),
    );
    assert_eq!(activate(&seams, &terms).unwrap_err().code, "rpc_error");
    assert_no_activation(&seams);

    for (pointer, value) in [
        ("/slot", Value::Null),
        ("/meta/err", json!("failed")),
        ("/transaction/signatures/0", json!(valid_signature(9))),
        ("/meta/postTokenBalances", Value::Null),
        ("/meta/postTokenBalances/1/uiTokenAmount/amount", json!("0")),
        ("/meta/postTokenBalances/1/uiTokenAmount/decimals", json!(9)),
        ("/meta/postTokenBalances/1/mint", json!(OTHER)),
        ("/meta/postTokenBalances/0/owner", json!(MERCHANT)),
    ] {
        let seams = FakeSeams::new();
        let terms = prepare_terms(&seams);
        seed_finalized_collection(&seams, &terms);
        configure_login(&seams, "user_1");
        queue_authorization_proof(&seams, &terms);
        status_response(&seams, "finalized");
        let mut tx = payment_transaction(&terms, Mutation::None);
        *tx.pointer_mut(pointer).unwrap() = value;
        seams.push_http_response(200, &rpc_result(tx).to_string());
        assert!(activate(&seams, &terms).is_err(), "{pointer}");
        assert_no_activation(&seams);
    }
}
