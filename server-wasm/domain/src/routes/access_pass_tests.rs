use super::*;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use ed25519_dalek::{Signer, SigningKey};
use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::models::{AccessPassOffer, AccessPassRecord, LedgerEntry};

const MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEST_ATA: &str = "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B";
const PAY_TO: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

fn setup() -> FakeSeams {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    seams.set_setting("x402.enabled", "true");
    seams.set_setting("x402.payment_address", PAY_TO);
    seams.set_setting("x402.token_mint", MINT);
    seams.set_setting("x402.token_decimals", "6");
    seams.set_setting("x402.network", "solana");
    seams.set_blockchain_rpc("https://rpc.example");
    seams
}

fn push_mainnet_genesis(seams: &FakeSeams) {
    seams.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":"5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"}"#,
    );
}

fn push_confirmed_transaction(seams: &FakeSeams, transaction: &str) {
    seams.push_http_response(
        200,
        &json!({"jsonrpc":"2.0","id":1,"result":crate::x402::rpc_fixtures::transaction_result(transaction, serde_json::Value::Null, crate::x402::rpc_fixtures::MERCHANT)}).to_string(),
    );
}

fn admin_context() -> String {
    json!({"authenticated":true,"systemAdmin":true,"csrfVerified":true}).to_string()
}

fn service_context() -> String {
    json!({
        "authenticated":true,"actorId":"cash-captcha","principalId":"cash-captcha",
        "authScheme":"extension-service","permissionClaims":[ids::CAPABILITY_ACCESS_PASS]
    })
    .to_string()
}

fn offer_body() -> Value {
    json!({
        "schemaVersion":1,"offerRef":"weather-minute-v1","productType":"access_pass",
        "sourceId":"weather-feed","durationSeconds":60,"priceAmountCents":100,
        "currency":"USD","rail":"x402","network":"solana","active":true,
        "effectiveAtMs":0,"retirementAtMs":null,"maximumTotalRequests":100
    })
}

fn request(route_id: &str, path: &str, body: Value, context: String) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: if route_id == ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_UPSERT {
            "PUT".into()
        } else {
            "POST".into()
        },
        path: path.into(),
        body: body.to_string(),
        context_json: context,
        ..Default::default()
    }
}

fn create_offer(seams: &FakeSeams) -> AccessPassOffer {
    let response = crate::router::handle_route(
        seams,
        request(
            ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_UPSERT,
            "/admin/access-passes/v1/offers",
            offer_body(),
            admin_context(),
        ),
    );
    assert_eq!(response.status, 201, "{}", response.body);
    serde_json::from_str(&response.body).unwrap()
}

#[test]
fn offer_terms_are_immutable_and_resolution_is_host_attested() {
    let seams = setup();
    let offer = create_offer(&seams);
    assert_eq!(offer.product_type, "access_pass");
    seams.set_now(seams.now_unix_secs() + 2);
    let replay = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_UPSERT,
            "/admin/access-passes/v1/offers",
            offer_body(),
            admin_context(),
        ),
    );
    assert_eq!(replay.status, 200);

    let mut changed = offer_body();
    changed["durationSeconds"] = json!(120);
    let conflict = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_UPSERT,
            "/admin/access-passes/v1/offers",
            changed,
            admin_context(),
        ),
    );
    assert_error(&conflict, 409, "offer_immutable");

    let body = json!({"schemaVersion":1,"offerRef":"weather-minute-v1","sourceId":"weather-feed","durationSeconds":60});
    let unauthenticated = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ACCESS_PASS_OFFER_RESOLVE,
            "/access-passes/v1/offers/resolve",
            body.clone(),
            String::new(),
        ),
    );
    assert_error(&unauthenticated, 403, "service_context_required");
    let resolved = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ACCESS_PASS_OFFER_RESOLVE,
            "/access-passes/v1/offers/resolve",
            body,
            service_context(),
        ),
    );
    assert_eq!(resolved.status, 200, "{}", resolved.body);
    let value: Value = serde_json::from_str(&resolved.body).unwrap();
    assert_eq!(
        value["offer402"]["payment"]["recipientTokenAccount"],
        DEST_ATA
    );
    assert!(value.to_string().find("rpc.example").is_none());
    assert!(value.to_string().find(PAY_TO).is_some());
}

#[test]
fn resolution_rejects_wrong_source_duration_and_inactive_offer() {
    let seams = setup();
    create_offer(&seams);
    for (source, duration, code) in [
        ("other-feed", 60, "wrong_source"),
        ("weather-feed", 120, "wrong_duration"),
    ] {
        let response = crate::router::handle_route(
            &seams,
            request(
                ids::ROUTE_ACCESS_PASS_OFFER_RESOLVE,
                "/access-passes/v1/offers/resolve",
                json!({"schemaVersion":1,"offerRef":"weather-minute-v1","sourceId":source,"durationSeconds":duration}),
                service_context(),
            ),
        );
        assert_error(&response, 409, code);
    }
    let state = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_STATE,
            "/admin/access-passes/v1/offers/state",
            json!({"schemaVersion":1,"offerRef":"weather-minute-v1","state":"inactive","retirementAtMs":null}),
            admin_context(),
        ),
    );
    assert_eq!(state.status, 200);
    let response = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ACCESS_PASS_OFFER_RESOLVE,
            "/access-passes/v1/offers/resolve",
            json!({"schemaVersion":1,"offerRef":"weather-minute-v1","sourceId":"weather-feed","durationSeconds":60}),
            service_context(),
        ),
    );
    assert_error(&response, 409, "offer_inactive");

    let missing = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ACCESS_PASS_OFFER_RESOLVE,
            "/access-passes/v1/offers/resolve",
            json!({"schemaVersion":1,"offerRef":"missing-offer","sourceId":"weather-feed","durationSeconds":60}),
            service_context(),
        ),
    );
    assert_error(&missing, 404, "offer_missing");

    let mut wrong_type = offer_body();
    wrong_type["offerRef"] = json!("wrong-type");
    wrong_type["productType"] = json!("subscription");
    let response = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_UPSERT,
            "/admin/access-passes/v1/offers",
            wrong_type,
            admin_context(),
        ),
    );
    assert_error(&response, 400, "bad_request");
}

#[test]
fn public_purchase_returns_machine_readable_402_and_confirmation_issues_once() {
    let seams = setup();
    create_offer(&seams);
    let delegated = SigningKey::from_bytes(&[9u8; 32]);
    let delegated_public_key = bs58::encode(delegated.verifying_key().to_bytes()).into_string();
    let body = json!({"schemaVersion":1,"offerRef":"weather-minute-v1","delegatedPublicKey":delegated_public_key});
    let quote = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ACCESS_PASS_PURCHASE,
            "/access-passes/v1/purchase",
            body.clone(),
            String::new(),
        ),
    );
    assert_eq!(quote.status, 402, "{}", quote.body);
    let quote_body: Value = serde_json::from_str(&quote.body).unwrap();
    assert_eq!(quote_body["accepts"][0]["maxAmountRequired"], "1000000");
    let challenge_id = quote_body["challengeId"].as_str().unwrap();
    let memo = quote_body["accepts"][0]["extra"]["memo"].as_str().unwrap();
    let transaction = build_payment_proof(memo, 1_000_000);
    let header = BASE64
        .encode(json!({"network":"solana","payload":{"transaction":transaction}}).to_string());
    let mut paid = request(
        ids::ROUTE_ACCESS_PASS_PURCHASE,
        "/access-passes/v1/purchase",
        json!({"schemaVersion":1,"offerRef":"weather-minute-v1","delegatedPublicKey":delegated_public_key,"challengeId":challenge_id}),
        String::new(),
    );
    paid.headers.push(("X-PAYMENT".into(), header.clone()));
    let confirmed_at = seams.now_unix_secs() + 7;
    seams.push_http_time_advance(0);
    seams.push_http_time_advance(7);
    push_mainnet_genesis(&seams);
    seams.push_http_error("broadcast response lost");
    seams.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"err":null,"confirmationStatus":"confirmed"}]}}"#,
    );
    push_confirmed_transaction(&seams, &transaction);
    let issued = crate::router::handle_route(&seams, paid.clone());
    assert_eq!(issued.status, 200, "{}", issued.body);
    let issued_body: Value = serde_json::from_str(&issued.body).unwrap();
    assert_eq!(issued_body["status"], "active");
    assert_eq!(issued_body["startsAtMs"], confirmed_at * 1000);
    assert_eq!(
        issued_body["expiresAtMs"].as_i64().unwrap() - issued_body["startsAtMs"].as_i64().unwrap(),
        60_000
    );
    let pass_count = seams.entry_count(ids::MODEL_ACCESS_PASSES);
    let replay = crate::router::handle_route(&seams, paid);
    assert_eq!(replay.status, 200);
    assert_eq!(seams.entry_count(ids::MODEL_ACCESS_PASSES), pass_count);

    let duplicate_transaction = build_payment_proof_with_seed(memo, 1_000_000, 6);
    let mut duplicate = request(
        ids::ROUTE_ACCESS_PASS_PURCHASE,
        "/access-passes/v1/purchase",
        json!({"schemaVersion":1,"offerRef":"weather-minute-v1","delegatedPublicKey":delegated_public_key,"challengeId":challenge_id}),
        String::new(),
    );
    duplicate.headers.push((
        "X-PAYMENT".into(),
        BASE64.encode(json!({"payload":{"transaction":duplicate_transaction}}).to_string()),
    ));
    assert_error(
        &crate::router::handle_route(&seams, duplicate),
        409,
        "payment_replay",
    );
    assert_eq!(seams.entry_count(ids::MODEL_ACCESS_PASSES), pass_count);
}

#[test]
fn processed_payment_remains_denied_until_confirmed_reconcile() {
    let seams = setup();
    create_offer(&seams);
    let key = SigningKey::from_bytes(&[9u8; 32]);
    let public_key = bs58::encode(key.verifying_key().to_bytes()).into_string();
    let quote = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ACCESS_PASS_PURCHASE,
            "/access-passes/v1/purchase",
            json!({"schemaVersion":1,"offerRef":"weather-minute-v1","delegatedPublicKey":public_key}),
            String::new(),
        ),
    );
    let q: Value = serde_json::from_str(&quote.body).unwrap();
    let tx = build_payment_proof(
        q["accepts"][0]["extra"]["memo"].as_str().unwrap(),
        1_000_000,
    );
    let mut paid = request(
        ids::ROUTE_ACCESS_PASS_PURCHASE,
        "/access-passes/v1/purchase",
        json!({"schemaVersion":1,"offerRef":"weather-minute-v1","delegatedPublicKey":public_key,"challengeId":q["challengeId"]}),
        String::new(),
    );
    paid.headers.push((
        "x-payment".into(),
        BASE64.encode(json!({"payload":{"transaction":tx}}).to_string()),
    ));
    push_mainnet_genesis(&seams);
    seams.push_http_error("broadcast response lost");
    for _ in 0..6 {
        seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"err":null,"confirmationStatus":"processed"}]}}"#);
    }
    let pending = crate::router::handle_route(&seams, paid);
    assert_eq!(pending.status, 202, "{}", pending.body);
    let pending_body: Value = serde_json::from_str(&pending.body).unwrap();
    assert_eq!(pending_body["status"], "pending");
    let pass_id = pending_body["passId"].as_str().unwrap();
    push_mainnet_genesis(&seams);
    seams.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"err":null,"confirmationStatus":"confirmed"}]}}"#,
    );
    push_confirmed_transaction(&seams, &tx);
    let outcome = crate::router::run_job(
        &seams,
        crate::JobExecution {
            job_id: ids::JOB_X402_RECONCILE.into(),
            metadata_json: "{}".into(),
            ..Default::default()
        },
    );
    assert_eq!(outcome.status, crate::JobStatus::Succeeded);
    assert_eq!(
        seams
            .get_entry(ids::MODEL_ACCESS_PASSES, &format!("pass:{pass_id}"))
            .unwrap()["status"],
        "active"
    );
}

#[test]
fn pending_payment_rebroadcasts_and_preserves_ambiguous_expiry_after_restart() {
    let seams = setup();
    create_offer(&seams);
    let key = SigningKey::from_bytes(&[9u8; 32]);
    let public_key = bs58::encode(key.verifying_key().to_bytes()).into_string();
    let quote = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ACCESS_PASS_PURCHASE,
            "/access-passes/v1/purchase",
            json!({"schemaVersion":1,"offerRef":"weather-minute-v1","delegatedPublicKey":public_key}),
            String::new(),
        ),
    );
    let q: Value = serde_json::from_str(&quote.body).unwrap();
    let tx = build_payment_proof(
        q["accepts"][0]["extra"]["memo"].as_str().unwrap(),
        1_000_000,
    );
    let mut paid = request(
        ids::ROUTE_ACCESS_PASS_PURCHASE,
        "/access-passes/v1/purchase",
        json!({"schemaVersion":1,"offerRef":"weather-minute-v1","delegatedPublicKey":public_key,"challengeId":q["challengeId"]}),
        String::new(),
    );
    paid.headers.push((
        "x-payment".into(),
        BASE64.encode(json!({"payload":{"transaction":tx}}).to_string()),
    ));
    push_mainnet_genesis(&seams);
    seams.push_http_error("broadcast response lost");
    for _ in 0..6 {
        seams.push_http_response(
            200,
            r#"{"jsonrpc":"2.0","id":1,"result":{"value":[{"err":null,"confirmationStatus":"processed"}]}}"#,
        );
    }
    let pending = crate::router::handle_route(&seams, paid);
    assert_eq!(pending.status, 202, "{}", pending.body);
    let pending_body: Value = serde_json::from_str(&pending.body).unwrap();
    let pass_id = pending_body["passId"].as_str().unwrap();

    // Simulate a fresh worker observing that the timed-out broadcast never
    // reached this RPC node while its blockhash is still usable.
    let request_count = seams.http_requests.borrow().len();
    push_mainnet_genesis(&seams);
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":[null]}}"#);
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":true}}"#);
    seams.push_http_error("rebroadcast response lost");
    let first = crate::router::run_job(
        &seams,
        crate::JobExecution {
            job_id: ids::JOB_X402_RECONCILE.into(),
            metadata_json: "{}".into(),
            ..Default::default()
        },
    );
    assert_eq!(first.status, crate::JobStatus::Succeeded);
    let requests = seams.http_requests.borrow();
    let rebroadcast: Value =
        serde_json::from_str(requests[request_count + 3]["body"].as_str().unwrap()).unwrap();
    assert_eq!(rebroadcast["method"], "sendTransaction");
    assert_eq!(rebroadcast["params"][0], tx);
    drop(requests);
    assert_eq!(
        seams
            .get_entry(ids::MODEL_ACCESS_PASSES, &format!("pass:{pass_id}"))
            .unwrap()["status"],
        "pending"
    );

    // A single invalid blockhash response cannot release either durable record.
    push_mainnet_genesis(&seams);
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":[null]}}"#);
    seams.push_http_response(200, r#"{"jsonrpc":"2.0","id":1,"result":{"value":false}}"#);
    let expired = crate::router::run_job(
        &seams,
        crate::JobExecution {
            job_id: ids::JOB_X402_RECONCILE.into(),
            metadata_json: "{}".into(),
            ..Default::default()
        },
    );
    assert_eq!(expired.status, crate::JobStatus::Succeeded);
    let pass = seams
        .get_entry(ids::MODEL_ACCESS_PASSES, &format!("pass:{pass_id}"))
        .unwrap();
    assert_eq!(pass["status"], "pending");
    let payment_reference = pass["paymentReference"].as_str().unwrap();
    assert_eq!(
        seams
            .get_entry(ids::MODEL_LEDGER, payment_reference)
            .unwrap()["status"],
        "pending"
    );
    let requests_before_replay = seams.http_requests.borrow().len();
    let replay = crate::router::run_job(
        &seams,
        crate::JobExecution {
            job_id: ids::JOB_X402_RECONCILE.into(),
            metadata_json: "{}".into(),
            ..Default::default()
        },
    );
    assert_eq!(replay.status, crate::JobStatus::Succeeded);
    assert!(seams.http_requests.borrow().len() > requests_before_replay);
    assert_eq!(
        seams
            .get_entry(ids::MODEL_LEDGER, payment_reference)
            .unwrap()["status"],
        "pending"
    );
}

#[test]
fn delegated_proof_authorizes_once_and_lifecycle_denials_fail_closed() {
    let seams = setup();
    let signing = SigningKey::from_bytes(&[9u8; 32]);
    let public_key = bs58::encode(signing.verifying_key().to_bytes()).into_string();
    seed_pass(&seams, &public_key, "active", "succeeded", 0, 60_000);
    let request = signed_authorization(
        &signing,
        "nonce-0000000001",
        "weather-feed",
        "GET",
        seams.now_unix_secs() * 1000,
    );
    let accepted = crate::router::handle_route(&seams, request.clone());
    assert_eq!(accepted.status, 200, "{}", accepted.body);
    let value: Value = serde_json::from_str(&accepted.body).unwrap();
    assert_eq!(value["subjectBindingVerified"], true);
    assert_eq!(value["subjectRef"], "csub_test");

    let concurrent = signed_authorization(
        &signing,
        "nonce-0000000006",
        "weather-feed",
        "GET",
        seams.now_unix_secs() * 1000,
    );
    assert_eq!(crate::router::handle_route(&seams, concurrent).status, 200);
    let replay = crate::router::handle_route(&seams, request);
    assert_error(&replay, 409, "replay");

    let invalid = signed_authorization(
        &SigningKey::from_bytes(&[8u8; 32]),
        "nonce-0000000002",
        "weather-feed",
        "GET",
        seams.now_unix_secs() * 1000,
    );
    assert_error(
        &crate::router::handle_route(&seams, invalid),
        401,
        "invalid_signature",
    );
    let wrong_source = signed_authorization(
        &signing,
        "nonce-0000000003",
        "other-feed",
        "GET",
        seams.now_unix_secs() * 1000,
    );
    assert_error(
        &crate::router::handle_route(&seams, wrong_source),
        403,
        "wrong_source",
    );
}

#[test]
fn delegated_proof_enforces_maximum_total_requests() {
    let seams = setup();
    let signing = SigningKey::from_bytes(&[9u8; 32]);
    let public_key = bs58::encode(signing.verifying_key().to_bytes()).into_string();
    seed_pass(&seams, &public_key, "active", "succeeded", 0, 60_000);
    let mut pass = seams
        .get_entry(ids::MODEL_ACCESS_PASSES, "pass:cpass_test0000000000")
        .unwrap();
    pass["offer"]["maximumTotalRequests"] = json!(1);
    seams.seed(ids::MODEL_ACCESS_PASSES, "pass:cpass_test0000000000", pass);

    let first = signed_authorization(
        &signing,
        "nonce-limit-00001",
        "weather-feed",
        "GET",
        seams.now_unix_secs() * 1000,
    );
    assert_eq!(crate::router::handle_route(&seams, first).status, 200);

    let second = signed_authorization(
        &signing,
        "nonce-limit-00002",
        "weather-feed",
        "GET",
        seams.now_unix_secs() * 1000,
    );
    assert_error(
        &crate::router::handle_route(&seams, second),
        403,
        "request_limit_exceeded",
    );
}

#[test]
fn offer_retirement_does_not_change_issued_terms_and_subjects_are_stable() {
    let seams = setup();
    let signing = SigningKey::from_bytes(&[9u8; 32]);
    let public_key = bs58::encode(signing.verifying_key().to_bytes()).into_string();
    seed_pass(&seams, &public_key, "active", "succeeded", 0, 60_000);
    let mut retired_offer = offer_body();
    retired_offer["active"] = json!(false);
    retired_offer["retirementAtMs"] = json!(seams.now_unix_secs() * 1000);
    seams.seed(
        ids::MODEL_ACCESS_PASSES,
        "offer:weather-minute-v1",
        retired_offer,
    );

    let authorized = signed_authorization(
        &signing,
        "nonce-0000000007",
        "weather-feed",
        "GET",
        seams.now_unix_secs() * 1000,
    );
    assert_eq!(crate::router::handle_route(&seams, authorized).status, 200);

    let first = super::super::access_pass_purchase::subject_ref("wallet-private", &public_key);
    let second = super::super::access_pass_purchase::subject_ref("wallet-private", &public_key);
    let other = super::super::access_pass_purchase::subject_ref("other-wallet", &public_key);
    assert_eq!(first, second);
    assert_ne!(first, other);
}

#[test]
fn pending_expired_revoked_and_refunded_passes_are_denied() {
    for (pass_status, ledger_status, starts, expires, expected) in [
        ("pending", "pending", 0, 60_000, "pending_payment"),
        ("active", "succeeded", 1_000, 61_000, "not_started"),
        ("active", "succeeded", -120_000, -60_000, "expired"),
        ("revoked", "succeeded", 0, 60_000, "revoked"),
        ("active", "refunded", 0, 60_000, "refunded"),
        ("disputed", "succeeded", 0, 60_000, "disputed"),
        ("reversed", "succeeded", 0, 60_000, "reversed"),
    ] {
        let seams = setup();
        let signing = SigningKey::from_bytes(&[9u8; 32]);
        let public_key = bs58::encode(signing.verifying_key().to_bytes()).into_string();
        seed_pass(
            &seams,
            &public_key,
            pass_status,
            ledger_status,
            starts,
            expires,
        );
        let req = signed_authorization(
            &signing,
            "nonce-0000000004",
            "weather-feed",
            "GET",
            seams.now_unix_secs() * 1000,
        );
        assert_error(
            &crate::router::handle_route(&seams, req),
            if expected == "pending_payment" {
                402
            } else {
                403
            },
            expected,
        );
    }
}

#[test]
fn malformed_missing_and_wrong_key_proofs_have_stable_denials() {
    let seams = setup();
    let signing = SigningKey::from_bytes(&[9u8; 32]);
    let public_key = bs58::encode(signing.verifying_key().to_bytes()).into_string();
    seed_pass(&seams, &public_key, "active", "succeeded", 0, 60_000);
    let missing = request(
        ids::ROUTE_ACCESS_PASS_AUTHORIZE,
        "/access-passes/v1/authorize",
        json!({"schemaVersion":1,"credential":null,"delegatedPublicKey":public_key,"request":null,"proof":null}),
        service_context(),
    );
    assert_error(
        &crate::router::handle_route(&seams, missing),
        401,
        "missing_credential",
    );

    let wrong_key = bs58::encode(
        SigningKey::from_bytes(&[8u8; 32])
            .verifying_key()
            .to_bytes(),
    )
    .into_string();
    let mut request = signed_authorization(
        &signing,
        "nonce-0000000005",
        "weather-feed",
        "GET",
        seams.now_unix_secs() * 1000,
    );
    let mut body: Value = serde_json::from_str(&request.body).unwrap();
    body["delegatedPublicKey"] = json!(wrong_key);
    request.body = body.to_string();
    assert_error(
        &crate::router::handle_route(&seams, request),
        403,
        "wrong_delegated_key",
    );

    let unavailable = setup();
    unavailable.seed(
        ids::MODEL_ACCESS_PASSES,
        "pass:cpass_test0000000000",
        json!({"malformed":true}),
    );
    let request = signed_authorization(
        &signing,
        "nonce-0000000008",
        "weather-feed",
        "GET",
        unavailable.now_unix_secs() * 1000,
    );
    assert_error(
        &crate::router::handle_route(&unavailable, request),
        503,
        "pay_unavailable",
    );
}

fn seed_pass(
    seams: &FakeSeams,
    delegated_key: &str,
    pass_status: &str,
    ledger_status: &str,
    starts_delta: i64,
    expires_delta: i64,
) {
    let now = seams.now_unix_secs();
    let offer = AccessPassOffer {
        schema_version: 1,
        offer_ref: "weather-minute-v1".into(),
        product_type: "access_pass".into(),
        source_id: "weather-feed".into(),
        duration_seconds: 60,
        price_amount_cents: 100,
        currency: "USD".into(),
        rail: "x402".into(),
        network: "solana".into(),
        active: true,
        effective_at_ms: 0,
        retirement_at_ms: None,
        maximum_total_requests: Some(100),
        terms_version: 1,
        terms_hash: "terms".into(),
        created_at: crate::time::iso8601(now),
        updated_at: crate::time::iso8601(now),
    };
    let pass = AccessPassRecord {
        schema_version: 1,
        pass_id: "cpass_test0000000000".into(),
        subject_ref: "csub_test".into(),
        status: pass_status.into(),
        offer,
        delegated_public_key: delegated_key.into(),
        payment_reference: "payment_test".into(),
        payer_wallet: "wallet-private".into(),
        starts_at_ms: Some(now * 1000 + starts_delta),
        expires_at_ms: Some(now * 1000 + expires_delta),
        created_at: crate::time::iso8601(now),
        updated_at: crate::time::iso8601(now),
    };
    let ledger = LedgerEntry {
        reference: "payment_test".into(),
        kind: "payment".into(),
        status: ledger_status.into(),
        gross_cents: 100,
        refund_cents: if ledger_status == "refunded" { 100 } else { 0 },
        currency: "USD".into(),
        customer_profile_id: None,
        route_path: None,
        product_id: Some("weather-minute-v1".into()),
        product_ids: vec!["weather-minute-v1".into()],
        provider: "x402".into(),
        provider_ref: Some("payment_test".into()),
        payer_wallet: Some("wallet-private".into()),
        created_at: crate::time::iso8601(now),
        processed_at: crate::time::iso8601(now),
        token_settlement: None,
    };
    seams.seed(
        ids::MODEL_ACCESS_PASSES,
        "pass:cpass_test0000000000",
        serde_json::to_value(pass).unwrap(),
    );
    seams.seed(
        ids::MODEL_LEDGER,
        "payment_test",
        serde_json::to_value(ledger).unwrap(),
    );
}

fn signed_authorization(
    signing: &SigningKey,
    nonce: &str,
    source: &str,
    method: &str,
    timestamp_ms: i64,
) -> RouteRequest {
    let pass_id = "cpass_test0000000000";
    let path = format!("/extensions/cash-captcha/v1/sources/{source}");
    let message = format!("CEDROS-PASS-PROOF-V1\npass-id:{pass_id}\nmethod:{method}\nsource-id:{source}\npath:{path}\nquery:a=1&x=hello%20world\ntimestamp-ms:{timestamp_ms}\nnonce:{nonce}");
    let signature = BASE64.encode(signing.sign(message.as_bytes()).to_bytes());
    request(
        ids::ROUTE_ACCESS_PASS_AUTHORIZE,
        "/access-passes/v1/authorize",
        json!({
            "schemaVersion":1,"credential":{"passId":pass_id},
            "delegatedPublicKey":bs58::encode(SigningKey::from_bytes(&[9u8;32]).verifying_key().to_bytes()).into_string(),
            "request":{"method":method,"sourceId":source,"path":path,"query":[["x","hello world"],["a","1"]]},
            "proof":{"algorithm":"Ed25519","timestampMs":timestamp_ms,"nonce":nonce,"signatureBase64":signature}
        }),
        service_context(),
    )
}

fn build_payment_proof(memo: &str, amount: u64) -> String {
    build_payment_proof_with_seed(memo, amount, 7)
}

fn build_payment_proof_with_seed(memo: &str, amount: u64, seed: u8) -> String {
    use crate::x402::pubkey;
    let signing = SigningKey::from_bytes(&[seed; 32]);
    let keys = [
        signing.verifying_key().to_bytes(),
        pubkey::parse(MINT).unwrap(),
        pubkey::parse(DEST_ATA).unwrap(),
        pubkey::parse("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").unwrap(),
        pubkey::parse("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr").unwrap(),
    ];
    let mut msg = vec![1, 0, 0, keys.len() as u8];
    for key in &keys {
        msg.extend_from_slice(key);
    }
    msg.extend_from_slice(&[0u8; 32]);
    msg.push(2);
    msg.extend_from_slice(&[3, 4, 0, 1, 2, 0, 10, 12]);
    msg.extend_from_slice(&amount.to_le_bytes());
    msg.push(6);
    msg.extend_from_slice(&[4, 0, memo.len() as u8]);
    msg.extend_from_slice(memo.as_bytes());
    let mut tx = vec![1];
    tx.extend_from_slice(&signing.sign(&msg).to_bytes());
    tx.extend_from_slice(&msg);
    BASE64.encode(tx)
}

fn assert_error(response: &RouteResponse, status: u16, code: &str) {
    assert_eq!(response.status, status, "{}", response.body);
    assert_eq!(
        serde_json::from_str::<Value>(&response.body).unwrap()["error"]["code"],
        code
    );
}
