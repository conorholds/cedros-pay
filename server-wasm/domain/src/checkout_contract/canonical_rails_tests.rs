use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::{Signer, SigningKey};
use serde_json::{json, Value};

use super::*;
use crate::auth::Buyer;
use crate::ctx::RequestContext;
use crate::fake::FakeSeams;
use crate::models::CreditAccount;
use crate::seams::HostSeams;

const OWNER: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

fn context() -> RequestContext {
    RequestContext {
        site_id: Some("site-a".into()),
        environment: Some("production".into()),
        ..Default::default()
    }
}

fn buyer() -> Buyer {
    Buyer {
        user_id: "buyer-1".into(),
        claims: Value::Null,
    }
}

fn configure_x402(seams: &FakeSeams) {
    seams.set_setting("x402.enabled", "true");
    seams.set_setting("x402.payment_address", OWNER);
    seams.set_setting("x402.token_mint", MINT);
    seams.set_setting("x402.token_decimals", "6");
    seams.set_blockchain_rpc("https://rpc.example");
}

fn push_mainnet_genesis(seams: &FakeSeams) {
    seams.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":"5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"}"#,
    );
}

fn push_confirmed(seams: &FakeSeams, transaction: &str) {
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":crate::x402::rpc_fixtures::transaction_result(transaction, serde_json::Value::Null, crate::x402::rpc_fixtures::MERCHANT)}).to_string(),
    );
}

#[test]
fn credits_settlement_is_atomic_and_exactly_replayable() {
    let seams = api_tests::setup();
    seams
        .secret_delete(crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT)
        .unwrap();
    seams.secret_reads.borrow_mut().clear();
    let buyer = buyer();
    let facade = CanonicalCheckoutFacade::for_verified_buyer(&seams, &context(), &buyer).unwrap();
    seed_account(&seams, 100_000);
    let quote = facade
        .quote(
            "credits-quote",
            &api_tests::quote_body("credits-quote", json!(["credits"])),
        )
        .unwrap();
    let body = api_tests::checkout_body("credits-checkout", &quote.operation_id, "credits");
    let first = facade.checkout("credits-checkout", &body).unwrap();
    let operation_id = match &first {
        CanonicalPaymentOutcome::Paid { operation_id, .. } => operation_id,
        other => panic!("expected paid checkout, got {other:?}"),
    };
    assert!(matches!(
        &first,
        CanonicalPaymentOutcome::Paid {
            replayed: false,
            ..
        }
    ));
    assert!(!serde_json::to_string(&first).unwrap().contains("buyer-1"));
    assert!(matches!(
        facade.checkout("credits-checkout", &body).unwrap(),
        CanonicalPaymentOutcome::Paid { replayed: true, .. }
    ));
    assert_eq!(account(&seams)["balanceCents"], 98_500);
    let commerce = crate::db::Db::new(&seams, crate::ids::DB_ACCESS)
        .read(crate::ids::MODEL_LEDGER, &crate::db::Query::new())
        .unwrap();
    assert_eq!(
        commerce
            .iter()
            .filter(|row| row.payload["kind"] == "payment")
            .count(),
        1
    );
    assert_eq!(
        commerce
            .iter()
            .filter(|row| row.payload["kind"] == "order")
            .count(),
        1
    );
    let ledger = seams
        .get_entry(crate::ids::MODEL_LEDGER, operation_id)
        .unwrap();
    assert_eq!(ledger["customerProfileId"], "buyer-1");
    assert_eq!(ledger["productIds"], json!(["product-1"]));
    assert_eq!(seams.entry_count(crate::ids::MODEL_CREDITS), 2);
    assert!(!seams.secret_reads.borrow().iter().any(|key| matches!(
        key.as_str(),
        crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT | crate::ids::SECRET_STRIPE_KEY
    )));
    assert!(seams.http_requests.borrow().is_empty());
    assert!(seams
        .logs
        .borrow()
        .iter()
        .all(|(_, message)| !message.contains("buyer-1")));
}

#[test]
fn insufficient_credits_are_terminal_without_claim_or_mutation() {
    let seams = api_tests::setup();
    let buyer = buyer();
    let facade = CanonicalCheckoutFacade::for_verified_buyer(&seams, &context(), &buyer).unwrap();
    seed_account(&seams, 1_000);
    let quote = facade
        .quote(
            "low-quote",
            &api_tests::quote_body("low-quote", json!(["credits"])),
        )
        .unwrap();
    let body = api_tests::checkout_body("low-checkout", &quote.operation_id, "credits");
    let outcome = facade.checkout("low-checkout", &body).unwrap();
    assert!(matches!(
        outcome,
        CanonicalPaymentOutcome::Terminal { ref code, .. } if code == "insufficient-funds"
    ));
    assert_eq!(account(&seams)["balanceCents"], 1_000);
    assert_eq!(seams.entry_count(crate::ids::MODEL_LEDGER), 0);
    seed_account(&seams, 100_000);
    assert!(matches!(
        facade.checkout("low-checkout", &body).unwrap(),
        CanonicalPaymentOutcome::Terminal {
            ref code,
            replayed: true,
            ..
        } if code == "insufficient-funds"
    ));
    assert_eq!(account(&seams)["balanceCents"], 100_000);
    assert_eq!(seams.entry_count(crate::ids::MODEL_WEBHOOK_OUTBOX), 0);
    let quote = seams
        .get_entry(
            OPERATION_MODEL,
            &identity::operation_entry_key(&quote.operation_id).unwrap(),
        )
        .unwrap();
    assert!(quote.get("settlementClaim").is_none());
}

#[test]
fn x402_response_loss_replays_the_exact_prepared_transaction_and_settles() {
    let seams = api_tests::setup();
    seams
        .secret_delete(crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT)
        .unwrap();
    seams.secret_reads.borrow_mut().clear();
    configure_x402(&seams);
    let context = context();
    let buyer = buyer();
    let facade = CanonicalCheckoutFacade::for_verified_buyer(&seams, &context, &buyer).unwrap();
    let quote = facade
        .quote(
            "x402-quote",
            &api_tests::quote_body("x402-quote", json!(["x402"])),
        )
        .unwrap();
    let binding = quote.quote.x402.as_ref().unwrap();
    let transaction = build_proof(binding);
    let signature = signature(&transaction);
    let body = x402_body("x402-checkout", &quote.operation_id, &transaction);
    push_mainnet_genesis(&seams);
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":signature}).to_string(),
    );
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":[null]}}"#);
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":true}}"#);
    assert!(matches!(
        facade.checkout("x402-checkout", &body).unwrap(),
        CanonicalPaymentOutcome::Processing {
            replayed: false,
            ..
        }
    ));
    let pending = seams
        .get_entry(crate::ids::MODEL_LEDGER, &signature)
        .unwrap();
    assert_eq!(pending["status"], "pending");

    push_mainnet_genesis(&seams);
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":signature}).to_string(),
    );
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"confirmed","err":null}]}}"#);
    push_confirmed(&seams, &transaction);
    let paid = facade.checkout("x402-checkout", &body).unwrap();
    assert!(matches!(
        paid,
        CanonicalPaymentOutcome::Paid { replayed: true, .. }
    ));
    let ledger = seams
        .get_entry(crate::ids::MODEL_LEDGER, &signature)
        .unwrap();
    assert_eq!(ledger["status"], "succeeded");
    assert_eq!(ledger["customerProfileId"], "buyer-1");
    assert_eq!(ledger["productIds"], json!(["product-1"]));
    assert_eq!(seams.entry_count(crate::ids::MODEL_WEBHOOK_OUTBOX), 1);
    assert_eq!(deliver_settlement_effects(&seams, 20).unwrap().delivered, 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_CHECKOUT_SETTLED), 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_ENTITLEMENT_CHANGED), 1);
    assert!(!seams.secret_reads.borrow().iter().any(|key| matches!(
        key.as_str(),
        crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT | crate::ids::SECRET_STRIPE_KEY
    )));
    assert!(seams
        .http_requests
        .borrow()
        .iter()
        .all(|request| !request.to_string().contains("stripe.com")));
}

#[test]
fn x402_exact_amount_failure_never_claims_the_quote() {
    let seams = api_tests::setup();
    configure_x402(&seams);
    let facade = api_tests::facade(&seams);
    let quote = facade
        .quote(
            "exact-quote",
            &api_tests::quote_body("exact-quote", json!(["x402"])),
        )
        .unwrap();
    let mut binding = quote.quote.x402.clone().unwrap();
    binding.amount_atomic += 1;
    let transaction = build_proof(&binding);
    let error = facade
        .checkout(
            "exact-checkout",
            &x402_body("exact-checkout", &quote.operation_id, &transaction),
        )
        .unwrap_err();
    assert_eq!((error.status, error.code), (422, "unprocessable"));
    assert_eq!(seams.entry_count(crate::ids::MODEL_LEDGER), 0);
}

#[test]
fn one_quote_cannot_be_claimed_by_competing_payment_rails() {
    let seams = api_tests::setup();
    configure_x402(&seams);
    let buyer = buyer();
    let facade = CanonicalCheckoutFacade::for_verified_buyer(&seams, &context(), &buyer).unwrap();
    seed_account(&seams, 100_000);
    let quote = facade
        .quote(
            "rail-quote",
            &api_tests::quote_body("rail-quote", json!(["x402", "credits"])),
        )
        .unwrap();
    let transaction = build_proof(quote.quote.x402.as_ref().unwrap());
    let signature = signature(&transaction);
    push_mainnet_genesis(&seams);
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":signature}).to_string(),
    );
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":[null]}}"#);
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":true}}"#);
    let body = x402_body("rail-x402", &quote.operation_id, &transaction);
    assert!(matches!(
        facade.checkout("rail-x402", &body).unwrap(),
        CanonicalPaymentOutcome::Processing { .. }
    ));
    let error = facade
        .checkout(
            "rail-credits",
            &api_tests::checkout_body("rail-credits", &quote.operation_id, "credits"),
        )
        .unwrap_err();
    assert_eq!(error.status, 409);
    assert_eq!(account(&seams)["balanceCents"], 100_000);
}

#[test]
fn x402_reconciler_finishes_a_no_inventory_checkout_after_restart() {
    let seams = api_tests::setup();
    configure_x402(&seams);
    let facade = api_tests::facade(&seams);
    let quote = facade
        .quote(
            "reconcile-quote",
            &api_tests::quote_body("reconcile-quote", json!(["x402"])),
        )
        .unwrap();
    let transaction = build_proof(quote.quote.x402.as_ref().unwrap());
    let signature = signature(&transaction);
    let body = x402_body("reconcile-x402", &quote.operation_id, &transaction);
    push_mainnet_genesis(&seams);
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":signature}).to_string(),
    );
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":[null]}}"#);
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":true}}"#);
    let processing = facade.checkout("reconcile-x402", &body).unwrap();
    let operation_id = match processing {
        CanonicalPaymentOutcome::Processing { operation_id, .. } => operation_id,
        other => panic!("expected processing, got {other:?}"),
    };
    push_mainnet_genesis(&seams);
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":signature}).to_string(),
    );
    seams.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"confirmed","err":null}]}}"#,
    );
    push_confirmed(&seams, &transaction);
    let report = reconcile_settlements(&seams, 100).unwrap();
    assert_eq!(report.committed, 1);
    assert!(matches!(
        facade.status(&operation_id).unwrap(),
        CanonicalPaymentOutcome::Paid { .. }
    ));
}

fn seed_account(seams: &FakeSeams, balance: i64) {
    seams.seed(
        crate::ids::MODEL_CREDITS,
        "acct:buyer-1",
        serde_json::to_value(CreditAccount {
            subject_id: "buyer-1".into(),
            balance_cents: balance,
            held_cents: 0,
            currency: "USD".into(),
            updated_at: crate::time::iso8601(seams.now_unix_secs()),
        })
        .unwrap(),
    );
}

fn account(seams: &FakeSeams) -> Value {
    seams
        .get_entry(crate::ids::MODEL_CREDITS, "acct:buyer-1")
        .unwrap()
}

fn x402_body(key: &str, quote: &str, transaction: &str) -> String {
    let mut body: Value =
        serde_json::from_str(&api_tests::checkout_body(key, quote, "x402")).unwrap();
    body["railProof"]["transaction"] = Value::String(transaction.into());
    body.to_string()
}

fn signature(transaction: &str) -> String {
    let bytes = BASE64.decode(transaction).unwrap();
    let tx = crate::x402::transaction::parse(&bytes).unwrap();
    crate::x402::pubkey::encode_signature(&tx.signatures[0])
}

fn build_proof(binding: &X402QuoteBinding) -> String {
    let signing = SigningKey::from_bytes(&[7u8; 32]);
    let payer = signing.verifying_key().to_bytes();
    let mint = crate::x402::pubkey::parse(&binding.token_mint).unwrap();
    let dest = crate::x402::pubkey::parse(&binding.recipient_token_account).unwrap();
    let token = crate::x402::pubkey::parse("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap();
    let memo = crate::x402::pubkey::parse("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr").unwrap();
    let keys = [payer, mint, dest, token, memo];
    let mut message = vec![1, 0, 0, keys.len() as u8];
    for key in keys {
        message.extend_from_slice(&key);
    }
    message.extend_from_slice(&[9; 32]);
    message.extend_from_slice(&[2, 3, 4, 0, 1, 2, 0, 10, 12]);
    message.extend_from_slice(&binding.amount_atomic.to_le_bytes());
    message.push(binding.decimals);
    message.extend_from_slice(&[4, 0, binding.memo.len() as u8]);
    message.extend_from_slice(binding.memo.as_bytes());
    let mut tx = vec![1];
    tx.extend_from_slice(&signing.sign(&message).to_bytes());
    tx.extend_from_slice(&message);
    BASE64.encode(tx)
}

fn pending_x402(seams: &FakeSeams, witnessed: bool) -> (String, String) {
    configure_x402(seams);
    let facade = api_tests::facade(seams);
    let quote = facade
        .quote(
            "audit-quote",
            &api_tests::quote_body("audit-quote", json!(["x402"])),
        )
        .unwrap();
    let transaction = build_proof(quote.quote.x402.as_ref().unwrap());
    push_mainnet_genesis(seams);
    seams.push_http_error("broadcast outcome lost");
    seams.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"context":{"slot":100},"value":[null]}}"#,
    );
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":{"context":{"slot":100},"value":witnessed}})
            .to_string(),
    );
    let result = facade
        .checkout(
            "audit-pay",
            &x402_body("audit-pay", &quote.operation_id, &transaction),
        )
        .unwrap();
    let CanonicalPaymentOutcome::Processing { operation_id, .. } = result else {
        panic!("{result:?}")
    };
    (operation_id, transaction)
}

fn queue_reconcile(seams: &FakeSeams, status: Value) {
    push_mainnet_genesis(seams);
    seams.push_http_error("rebroadcast outcome lost");
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":{"context":{"slot":200},"value":[status]}})
            .to_string(),
    );
}

#[test]
fn x402_restart_expiry_requires_persisted_validity_and_fresh_rooted_absence() {
    for witnessed in [false, true] {
        let seams = api_tests::setup();
        let (operation_id, transaction) = pending_x402(&seams, witnessed);
        queue_reconcile(&seams, Value::Null);
        seams.push_http_response(
            200,
            r#"{"jsonrpc":"2.0","id":1,"result":{"context":{"slot":200},"value":false}}"#,
        );
        if witnessed {
            seams.push_http_response(
                200,
                r#"{"jsonrpc":"2.0","id":1,"result":{"context":{"slot":200},"value":[null]}}"#,
            );
        }
        let report = reconcile_settlements(&seams, 100).unwrap();
        assert_eq!(report.released, usize::from(witnessed));
        let ledger = seams
            .get_entry(crate::ids::MODEL_LEDGER, &signature(&transaction))
            .unwrap();
        assert_eq!(
            ledger["status"],
            if witnessed { "failed" } else { "pending" }
        );
        let outcome = api_tests::facade(&seams).status(&operation_id).unwrap();
        assert_eq!(
            matches!(outcome, CanonicalPaymentOutcome::Terminal { .. }),
            witnessed
        );
        assert_eq!(seams.event_count(crate::ids::EVENT_PAYMENT_SUCCEEDED), 0);
    }
}

#[test]
fn x402_confirmation_waits_for_finalized_effects_and_converges_once_after_restart() {
    let seams = api_tests::setup();
    let (operation_id, transaction) = pending_x402(&seams, true);
    // A confirmed signature still has no transaction at finalized commitment.
    queue_reconcile(&seams, json!({"err":null,"confirmationStatus":"confirmed"}));
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":null}"#);
    assert_eq!(reconcile_settlements(&seams, 100).unwrap().deferred, 1);
    assert_eq!(
        seams
            .get_entry(crate::ids::MODEL_LEDGER, &signature(&transaction))
            .unwrap()["status"],
        "pending"
    );
    queue_reconcile(&seams, json!({"err":null,"confirmationStatus":"finalized"}));
    push_confirmed(&seams, &transaction);
    assert_eq!(reconcile_settlements(&seams, 100).unwrap().committed, 1);
    assert!(matches!(
        api_tests::facade(&seams).status(&operation_id).unwrap(),
        CanonicalPaymentOutcome::Paid { .. }
    ));
    let calls = seams.http_requests.borrow().len();
    assert_eq!(reconcile_settlements(&seams, 100).unwrap().committed, 0);
    assert_eq!(seams.http_requests.borrow().len(), calls);
    deliver_settlement_effects(&seams, 20).unwrap();
    deliver_settlement_effects(&seams, 20).unwrap();
    assert_eq!(seams.event_count(crate::ids::EVENT_PAYMENT_SUCCEEDED), 1);
}

#[test]
fn x402_recovery_rejects_changed_persisted_amount_network_signature_and_transaction() {
    for field in ["signature", "network", "recentBlockhash", "transaction"] {
        let seams = api_tests::setup();
        let (operation_id, transaction) = pending_x402(&seams, true);
        let key = identity::operation_entry_key(&operation_id).unwrap();
        let mut stored = seams.get_entry(OPERATION_MODEL, &key).unwrap();
        stored["x402Settlement"][field] = json!("tampered");
        seams.seed(OPERATION_MODEL, &key, stored);
        let calls = seams.http_requests.borrow().len();
        assert!(reconcile_settlements(&seams, 100).is_err(), "{field}");
        assert_eq!(seams.http_requests.borrow().len(), calls, "{field}");
        assert_eq!(
            seams
                .get_entry(crate::ids::MODEL_LEDGER, &signature(&transaction))
                .unwrap()["status"],
            "pending"
        );
    }
    let seams = api_tests::setup();
    let (_, transaction) = pending_x402(&seams, true);
    let signature = signature(&transaction);
    let mut ledger = seams
        .get_entry(crate::ids::MODEL_LEDGER, &signature)
        .unwrap();
    ledger["tokenSettlement"]["amountAtomic"] = json!(1);
    seams.seed(crate::ids::MODEL_LEDGER, &signature, ledger);
    assert!(reconcile_settlements(&seams, 100).is_err());
}

#[test]
fn x402_recovery_cannot_broadcast_against_another_operations_claim() {
    let seams = api_tests::setup();
    let (operation_id, _) = pending_x402(&seams, true);
    let key = identity::operation_entry_key(&operation_id).unwrap();
    let operation: record::OperationRecord =
        serde_json::from_value(seams.get_entry(OPERATION_MODEL, &key).unwrap()).unwrap();
    let quote_id = record_rail::quote_id(&operation).unwrap();
    let key = identity::operation_entry_key(quote_id).unwrap();
    let mut quote = seams.get_entry(OPERATION_MODEL, &key).unwrap();
    quote["settlementClaim"]["checkoutOperationId"] = json!("another-operation");
    seams.seed(OPERATION_MODEL, &key, quote);
    let requests = seams.http_requests.borrow().len();
    assert!(reconcile_settlements(&seams, 100).is_err());
    assert_eq!(seams.http_requests.borrow().len(), requests);
}
