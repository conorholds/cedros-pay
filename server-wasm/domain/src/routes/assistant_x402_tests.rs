use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::{Signer, SigningKey};
use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;
use crate::reqresp::RouteRequest;
use crate::x402::{ata, pubkey};

const TARGET: &str = "https://merchant.example/premium/report";
const RUN_ID: &str = "run-stable-1";
const REQUEST_ID: &str = "request-stable-1";
const IDEMPOTENCY_KEY: &str = "purchase-stable-1";
const AMOUNT: u64 = 1_500_000;

struct Fixture {
    payer: SigningKey,
    payer_public_key: String,
    mint: String,
    merchant: String,
    recipient_token_account: String,
    blockhash: String,
}

impl Fixture {
    fn new() -> Self {
        let payer = SigningKey::from_bytes(&[17; 32]);
        let payer_public_key = bs58::encode(payer.verifying_key().to_bytes()).into_string();
        let mint = crate::x402::config::DEVNET_USDC_MINT.to_string();
        let merchant = bs58::encode([21_u8; 32]).into_string();
        let recipient_token_account = ata::derive_token_account(&merchant, &mint).unwrap();
        Self {
            payer,
            payer_public_key,
            mint,
            merchant,
            recipient_token_account,
            blockhash: bs58::encode([22_u8; 32]).into_string(),
        }
    }

    fn config(&self, status: &str, available: bool) -> Value {
        json!({
            "available": true,
            "mainWalletAddress": bs58::encode([31_u8; 32]).into_string(),
            "assistantWalletAvailable": available,
            "assistantWallet": {
                "vaultWalletId": "assistant-wallet-id",
                "activeVersionId": "assistant-version-id",
                "publicKey": self.payer_public_key,
                "cluster": "devnet",
                "status": status,
            },
            "managedWallet": {
                "vaultWalletId": "operational-wallet-id",
                "activeVersionId": "operational-version-id",
                "publicKey": bs58::encode([32_u8; 32]).into_string(),
                "cluster": "devnet",
                "status": "active",
            },
            "treasury": {
                "provider": "squads-v4",
                "vaultAddress": bs58::encode([33_u8; 32]).into_string(),
                "cluster": "devnet",
                "status": "active",
            },
            "allowedTokenMints": [self.mint],
            "solana": {"rpcUrl":"https://rpc.example","network":"devnet"},
        })
    }

    fn control(&self) -> AssistantX402Control {
        AssistantX402Control {
            wallet_id: "assistant-wallet-id".into(),
            wallet_version_id: "assistant-version-id".into(),
            public_key: self.payer_public_key.clone(),
            cluster: "devnet".into(),
            rpc_url: "https://rpc.example".into(),
            allowed_token_mints: vec![self.mint.clone()],
        }
    }

    fn requirement(&self) -> discovery::Requirement {
        discovery::Requirement {
            scheme: "solana-spl-transfer".into(),
            network: "devnet".into(),
            amount: AMOUNT,
            resource: TARGET.into(),
            pay_to: self.merchant.clone(),
            asset: self.mint.clone(),
            recipient_token_account: self.recipient_token_account.clone(),
            decimals: 6,
            memo: "resource=premium-report;request=stable".into(),
        }
    }

    fn discovery(&self) -> Value {
        self.discovery_with("devnet", AMOUNT, Value::Null)
    }

    fn discovery_with(&self, cluster: &str, amount: u64, unsafe_field: Value) -> Value {
        let mut payment = json!({
            "scheme": "solana-spl-transfer",
            "network": cluster,
            "maxAmountRequired": amount.to_string(),
            "resource": TARGET,
            "description": "Premium report",
            "mimeType": "application/json",
            "payTo": self.merchant,
            "maxTimeoutSeconds": 300,
            "asset": self.mint,
            "extra": {
                "recipientTokenAccount": self.recipient_token_account,
                "decimals": 6,
                "memo": "resource=premium-report;request=stable",
                "tokenSymbol": "USDC",
            },
        });
        if !unsafe_field.is_null() {
            payment["feePayer"] = unsafe_field;
        }
        json!({"x402Version":0,"error":"payment required","accepts":[payment]})
    }

    fn signer_response(&self) -> (Value, String, String) {
        let unsigned = transaction::build(&self.control(), &self.requirement(), &self.blockhash)
            .expect("fixture transaction");
        let bytes = BASE64.decode(&unsigned.wire_base64).unwrap();
        let mut parsed = crate::x402::transaction::parse(&bytes).unwrap();
        parsed.signatures[0] = self.payer.sign(&parsed.message_bytes).to_bytes();
        let signature = pubkey::encode_signature(&parsed.signatures[0]);
        let signed = BASE64.encode(parsed.serialize());
        (
            json!({
                "walletId":"assistant-wallet-id",
                "walletVersionId":"assistant-version-id",
                "transactionSha256":unsigned.sha256,
                "signedTransactionBase64":signed,
                "signature":signature,
                "policyDecisionId":"policy-decision-1",
                "signedAt":"2026-08-11T12:00:00Z",
            }),
            unsigned.wire_base64,
            signed,
        )
    }
}

fn request() -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_ASSISTANT_X402_PURCHASE.into(),
        method: "POST".into(),
        path: "/assistant/v1/x402/purchase".into(),
        body: json!({"resourceUrl":TARGET,"maxAmountMicrounits":AMOUNT}).to_string(),
        context_json: json!({
            "authenticated":true,
            "authScheme":"bearer-token",
            "capabilityClaims":[ids::ROUTE_ASSISTANT_X402_PURCHASE],
            "assistantId":contract::ASSISTANT_ID,
            "assistantAction":contract::ACTION,
            "runId":RUN_ID,
            "requestId":REQUEST_ID,
            "idempotencyKey":IDEMPOTENCY_KEY,
            "confirmationVerified":true,
            "authorizedMaxAmountMicrounits":AMOUNT,
        })
        .to_string(),
        ..Default::default()
    }
}

fn body(response: RouteResponse) -> Value {
    assert_eq!(response.status, 200);
    serde_json::from_str(&response.body).unwrap()
}

fn rpc(value: Value) -> String {
    json!({"jsonrpc":"2.0","id":1,"result":value}).to_string()
}

fn queue_prepare(seams: &FakeSeams, fixture: &Fixture, discovery: Value) {
    push_devnet_genesis(seams);
    seams.push_http_response(402, &discovery.to_string());
    seams.push_http_response(200, &rpc(json!({"value":10_000})));
    seams.push_http_response(200, &rpc(json!({"value":{"amount":"2000000"}})));
    seams.push_http_response(
        200,
        &rpc(json!({
            "value":{"blockhash":fixture.blockhash,"lastValidBlockHeight":123}
        })),
    );
}

fn push_devnet_genesis(seams: &FakeSeams) {
    seams.push_http_response(
        200,
        &rpc(json!("EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG")),
    );
}

fn queue_confirmed_submission(seams: &FakeSeams, signed: &str) {
    seams.push_http_response(200, r#"{"access":"granted"}"#);
    seams.push_http_response(
        200,
        &rpc(json!({
            "value":[{"confirmationStatus":"confirmed","err":null}]
        })),
    );
    seams.push_http_response(
        200,
        &rpc(crate::x402::rpc_fixtures::transaction_result(
            signed,
            Value::Null,
            &Fixture::new().merchant,
        )),
    );
}

fn signer_payloads(seams: &FakeSeams) -> Vec<Value> {
    seams
        .provider_requests
        .borrow()
        .iter()
        .filter(|request| request.2 == ids::OP_BLOCKCHAIN_ASSISTANT_X402_SIGN)
        .map(|request| request.3.clone())
        .collect()
}

fn sorted_object_keys(value: &Value) -> Vec<String> {
    let mut keys = value
        .as_object()
        .expect("contract value must be an object")
        .keys()
        .cloned()
        .collect::<Vec<_>>();
    keys.sort();
    keys
}

fn sorted_required_fields(schema: &Value) -> Vec<String> {
    let mut fields = schema["required"]
        .as_array()
        .expect("contract schema must publish required fields")
        .iter()
        .map(|value| {
            value
                .as_str()
                .expect("required field must be a string")
                .to_string()
        })
        .collect::<Vec<_>>();
    fields.sort();
    fields
}

#[test]
fn valid_purchase_uses_only_the_assistant_signer_and_returns_redacted_success() {
    let fixture = Fixture::new();
    let seams = FakeSeams::new();
    seams.set_blockchain_config(fixture.config("active", true));
    queue_prepare(&seams, &fixture, fixture.discovery());
    let (signed_response, unsigned, signed) = fixture.signer_response();
    let expected_signature = signed_response["signature"].clone();
    seams.push_provider_response(signed_response);
    queue_confirmed_submission(&seams, &signed);

    let output = body(handle(&seams, &request()).unwrap());

    assert_eq!(output["boundary"], contract::BOUNDARY);
    assert_eq!(output["target"], TARGET);
    assert_eq!(output["output"]["status"], "confirmed");
    assert_eq!(output["output"]["assistantId"], "ai-assistant");
    assert_eq!(output["output"]["walletPurpose"], "site-assistant");
    assert_eq!(output["output"]["payerPublicKey"], fixture.payer_public_key);
    assert_eq!(
        output["output"]["transactionResult"]["signature"],
        expected_signature
    );
    assert_eq!(output["output"]["postcondition"]["verified"], true);
    assert_eq!(output["isError"], false);
    assert_eq!(output["replayed"], false);

    let payloads = signer_payloads(&seams);
    assert_eq!(payloads.len(), 1);
    assert_eq!(payloads[0]["walletId"], "assistant-wallet-id");
    assert_eq!(payloads[0]["walletVersionId"], "assistant-version-id");
    assert_eq!(payloads[0]["cluster"], "devnet");
    assert_eq!(payloads[0]["paymentMint"], fixture.mint);
    assert_eq!(payloads[0]["paymentAmountMicrounits"], AMOUNT);
    assert_eq!(payloads[0]["tokenDecimals"], 6);
    assert_eq!(payloads[0]["payTo"], fixture.merchant);
    assert_eq!(
        payloads[0]["destinationTokenAccount"],
        fixture.recipient_token_account
    );
    assert_eq!(
        payloads[0]["memo"],
        "resource=premium-report;request=stable"
    );
    assert_eq!(payloads[0]["assistantId"], "ai-assistant");
    assert_eq!(payloads[0]["runId"], RUN_ID);
    assert_eq!(payloads[0]["requestId"], REQUEST_ID);
    assert_eq!(payloads[0]["idempotencyKey"], IDEMPOTENCY_KEY);
    assert_eq!(payloads[0]["maxFeeLamports"], 5_000);
    assert!(payloads[0].get("maxLamports").is_none());
    assert_eq!(payloads[0]["serializedTransactionBase64"], unsigned);
    assert_eq!(
        seams
            .provider_requests
            .borrow()
            .iter()
            .find(|request| request.2 == ids::OP_BLOCKCHAIN_ASSISTANT_X402_SIGN)
            .unwrap()
            .0,
        ids::PROVIDER_BLOCKCHAIN_ASSISTANT_X402_SIGN,
    );
    let public_result = output.to_string();
    let logs = format!("{:?}", seams.logs.borrow());
    for protected in [
        unsigned.as_str(),
        signed.as_str(),
        ids::OP_BLOCKCHAIN_ASSISTANT_X402_SIGN,
        ids::PROVIDER_BLOCKCHAIN_ASSISTANT_X402_SIGN,
    ] {
        assert!(!public_result.contains(protected));
        assert!(!logs.contains(protected));
    }
    assert!(seams.secret_reads.borrow().is_empty());
    assert!(!payloads[0].to_string().contains("operational-wallet-id"));
    let payment_header = seams
        .http_requests
        .borrow()
        .iter()
        .find_map(|request| {
            request["headers"].as_array()?.iter().find_map(|header| {
                (header[0] == "x-payment")
                    .then(|| header[1].as_str().map(str::to_string))
                    .flatten()
            })
        })
        .unwrap();
    let payment: Value = serde_json::from_slice(&BASE64.decode(payment_header).unwrap()).unwrap();
    assert_eq!(payment["payload"]["resource"], TARGET);
    assert_eq!(payment["payload"]["transaction"], signed);
}

#[test]
fn assistant_signing_payload_matches_the_published_vault_contract() {
    let fixture = Fixture::new();
    let seams = FakeSeams::new();
    seams.set_blockchain_config(fixture.config("active", true));
    queue_prepare(&seams, &fixture, fixture.discovery());
    let (response, _, signed) = fixture.signer_response();
    seams.push_provider_response(response);
    queue_confirmed_submission(&seams, &signed);
    let _ = handle(&seams, &request()).unwrap();

    let payload = signer_payloads(&seams).pop().expect("one signer payload");
    let contract: Value = serde_json::from_str(include_str!(
        "../../../../docs/assistant-x402-signing-contract.json"
    ))
    .unwrap();
    let provider_schema = &contract["providerOperation"]["payloadSchema"];
    assert_eq!(
        sorted_object_keys(&payload),
        sorted_required_fields(provider_schema)
    );
    assert_eq!(provider_schema["additionalProperties"], false);

    let vault_request = json!({
        "walletVersionId": payload["walletVersionId"],
        "cluster": payload["cluster"],
        "serializedTransactionBase64": payload["serializedTransactionBase64"],
        "transactionSha256": payload["transactionSha256"],
        "intent": {
            "kind": "assistantX402Payment",
            "paymentMint": payload["paymentMint"],
            "paymentAmountMicrounits": payload["paymentAmountMicrounits"],
            "tokenDecimals": payload["tokenDecimals"],
            "payTo": payload["payTo"],
            "destinationTokenAccount": payload["destinationTokenAccount"],
            "memo": payload["memo"],
            "maxFeeLamports": payload["maxFeeLamports"],
            "requestId": payload["requestId"],
            "assistantId": payload["assistantId"],
            "runId": payload["runId"],
        },
        "idempotencyKey": payload["idempotencyKey"],
    });
    let vault_schema = &contract["vaultRequest"]["bodySchema"];
    assert_eq!(
        sorted_object_keys(&vault_request),
        sorted_required_fields(vault_schema)
    );
    assert_eq!(
        sorted_object_keys(&vault_request["intent"]),
        sorted_required_fields(&vault_schema["properties"]["intent"])
    );
    assert_eq!(vault_request["intent"]["kind"], "assistantX402Payment");
    assert_eq!(
        contract["vaultRequest"]["walletIdSource"],
        "providerOperation.payload.walletId"
    );
    assert_eq!(
        sorted_object_keys(&contract["providerToVaultMapping"]),
        sorted_object_keys(&payload)
    );
}

#[test]
fn approval_budget_and_wallet_states_fail_before_egress_without_fallback() {
    let fixture = Fixture::new();
    let seams = FakeSeams::new();
    seams.set_blockchain_config(fixture.config("active", true));
    let mut approval = request();
    approval.context_json = approval.context_json.replace(
        "\"confirmationVerified\":true",
        "\"confirmationVerified\":false",
    );
    assert_eq!(
        body(handle(&seams, &approval).unwrap())["output"]["status"],
        "approval_required"
    );
    let mut budget = request();
    budget.body = json!({"resourceUrl":TARGET,"maxAmountMicrounits":AMOUNT + 1}).to_string();
    assert_eq!(
        body(handle(&seams, &budget).unwrap())["output"]["status"],
        "budget_denied"
    );

    for (status, available, expected) in [
        ("active", false, "wallet_unavailable"),
        ("rotating", false, "wallet_rotating"),
        ("disabled", false, "wallet_disabled"),
        ("blocked", false, "wallet_blocked"),
    ] {
        let state = FakeSeams::new();
        state.set_blockchain_config(fixture.config(status, available));
        assert_eq!(
            body(handle(&state, &request()).unwrap())["output"]["status"],
            expected
        );
        assert!(signer_payloads(&state).is_empty());
        assert!(state.http_requests.borrow().is_empty());
    }
    let missing = FakeSeams::new();
    let mut config = fixture.config("active", true);
    config["assistantWallet"] = Value::Null;
    missing.set_blockchain_config(config);
    assert_eq!(
        body(handle(&missing, &request()).unwrap())["output"]["status"],
        "wallet_unavailable"
    );
    assert!(signer_payloads(&missing).is_empty());
}

#[test]
fn unfunded_cluster_mismatch_and_unsafe_requirement_fail_closed() {
    let fixture = Fixture::new();
    let unfunded = FakeSeams::new();
    unfunded.set_blockchain_config(fixture.config("active", true));
    push_devnet_genesis(&unfunded);
    unfunded.push_http_response(402, &fixture.discovery().to_string());
    unfunded.push_http_response(200, &rpc(json!({"value":4_999})));
    unfunded.push_http_response(200, &rpc(json!({"value":{"amount":"1499999"}})));
    assert_eq!(
        body(handle(&unfunded, &request()).unwrap())["output"]["status"],
        "insufficient_balance"
    );

    let wrong_cluster = FakeSeams::new();
    wrong_cluster.set_blockchain_config(fixture.config("active", true));
    push_devnet_genesis(&wrong_cluster);
    wrong_cluster.push_http_response(
        402,
        &fixture
            .discovery_with("mainnet-beta", AMOUNT, Value::Null)
            .to_string(),
    );
    let cluster_output = body(handle(&wrong_cluster, &request()).unwrap());
    assert_eq!(cluster_output["output"]["status"], "cluster_mismatch");

    let unsafe_requirement = FakeSeams::new();
    unsafe_requirement.set_blockchain_config(fixture.config("active", true));
    push_devnet_genesis(&unsafe_requirement);
    unsafe_requirement.push_http_response(
        402,
        &fixture
            .discovery_with(
                "devnet",
                AMOUNT,
                json!(bs58::encode([32_u8; 32]).into_string()),
            )
            .to_string(),
    );
    let unsafe_output = body(handle(&unsafe_requirement, &request()).unwrap());
    assert_eq!(
        unsafe_output["output"]["failureCode"],
        "invalid_requirement"
    );
    assert!(signer_payloads(&unfunded).is_empty());
    assert!(signer_payloads(&wrong_cluster).is_empty());
    assert!(signer_payloads(&unsafe_requirement).is_empty());
}

#[test]
fn unsafe_signer_response_and_policy_denials_are_terminal() {
    let fixture = Fixture::new();
    let unsafe_signer = FakeSeams::new();
    unsafe_signer.set_blockchain_config(fixture.config("active", true));
    queue_prepare(&unsafe_signer, &fixture, fixture.discovery());
    let (mut response, _, _) = fixture.signer_response();
    response["signature"] = json!(bs58::encode([9_u8; 64]).into_string());
    unsafe_signer.push_provider_response(response);
    let result = body(handle(&unsafe_signer, &request()).unwrap());
    assert_eq!(result["output"]["failureCode"], "signing_rejected");
    assert_eq!(unsafe_signer.http_requests.borrow().len(), 5);

    let unsafe_metadata = FakeSeams::new();
    unsafe_metadata.set_blockchain_config(fixture.config("active", true));
    queue_prepare(&unsafe_metadata, &fixture, fixture.discovery());
    let (mut response, _, _) = fixture.signer_response();
    response["policyDecisionId"] = json!("policy\nunsafe");
    unsafe_metadata.push_provider_response(response);
    assert_eq!(
        body(handle(&unsafe_metadata, &request()).unwrap())["output"]["failureCode"],
        "signing_rejected"
    );

    let conflict = FakeSeams::new();
    conflict.set_blockchain_config(fixture.config("active", true));
    queue_prepare(&conflict, &fixture, fixture.discovery());
    conflict.push_provider_error("idempotency conflict");
    let conflict_result = body(handle(&conflict, &request()).unwrap());
    assert_eq!(conflict_result["output"]["failureCode"], "signing_rejected");

    for (error, expected) in [
        ("budget denied", "budget_denied"),
        ("Vault policy denied", "vault_policy_denied"),
    ] {
        let denied = FakeSeams::new();
        denied.set_blockchain_config(fixture.config("active", true));
        queue_prepare(&denied, &fixture, fixture.discovery());
        denied.push_provider_error(error);
        assert_eq!(
            body(handle(&denied, &request()).unwrap())["output"]["status"],
            expected
        );
        assert_eq!(denied.http_requests.borrow().len(), 5);
    }
}

#[test]
fn ambiguous_signing_retry_reuses_the_identical_provider_payload() {
    let fixture = Fixture::new();
    let seams = FakeSeams::new();
    seams.set_blockchain_config(fixture.config("active", true));
    queue_prepare(&seams, &fixture, fixture.discovery());
    seams.push_provider_error("Vault timeout");
    let first = body(handle(&seams, &request()).unwrap());
    assert_eq!(first["output"]["status"], "ambiguous");

    push_devnet_genesis(&seams);
    seams.push_http_response(402, &fixture.discovery().to_string());
    let (response, _, signed) = fixture.signer_response();
    seams.push_provider_response(response);
    queue_confirmed_submission(&seams, &signed);
    let second = body(handle(&seams, &request()).unwrap());
    assert_eq!(second["output"]["status"], "confirmed");
    assert_eq!(second["replayed"], true);
    let payloads = signer_payloads(&seams);
    assert_eq!(payloads.len(), 2);
    assert_eq!(payloads[0], payloads[1]);
}

#[test]
fn ambiguous_submission_reconciles_without_resigning_or_resubmitting() {
    let fixture = Fixture::new();
    let seams = FakeSeams::new();
    seams.set_blockchain_config(fixture.config("active", true));
    queue_prepare(&seams, &fixture, fixture.discovery());
    seams.push_provider_response(fixture.signer_response().0);
    seams.push_http_error("merchant timed out after accepting payment");
    seams.push_http_response(200, &rpc(json!({"value":[null]})));
    let first = body(handle(&seams, &request()).unwrap());
    assert_eq!(first["output"]["status"], "ambiguous");

    push_devnet_genesis(&seams);
    seams.push_http_response(200, &rpc(json!({"value":[null]})));
    let unresolved = body(handle(&seams, &request()).unwrap());
    assert_eq!(unresolved["output"]["status"], "ambiguous");

    push_devnet_genesis(&seams);
    seams.push_http_response(
        200,
        &rpc(json!({
            "value":[{"confirmationStatus":"confirmed","err":null}]
        })),
    );
    let signed = seams
        .get_entry(ids::MODEL_SUPPORT_AI, &store::key(IDEMPOTENCY_KEY))
        .and_then(|value| value["signedWireBase64"].as_str().map(str::to_string))
        .unwrap();
    seams.push_http_response(
        200,
        &rpc(crate::x402::rpc_fixtures::transaction_result(
            &signed,
            Value::Null,
            &fixture.merchant,
        )),
    );
    let second = body(handle(&seams, &request()).unwrap());
    assert_eq!(second["output"]["status"], "confirmed");
    assert_eq!(signer_payloads(&seams).len(), 1);
    let payment_submissions = seams
        .http_requests
        .borrow()
        .iter()
        .filter(|request| {
            request["url"] == TARGET
                && request["headers"]
                    .as_array()
                    .is_some_and(|headers| headers.iter().any(|header| header[0] == "x-payment"))
        })
        .count();
    assert_eq!(payment_submissions, 1);
}

#[test]
fn stale_version_changed_requirement_and_replay_mismatch_do_not_restart_payment() {
    let fixture = Fixture::new();
    let seams = FakeSeams::new();
    seams.set_blockchain_config(fixture.config("active", true));
    queue_prepare(&seams, &fixture, fixture.discovery());
    seams.push_provider_error("timeout");
    assert_eq!(
        body(handle(&seams, &request()).unwrap())["output"]["status"],
        "ambiguous"
    );
    let mut stale = fixture.config("active", true);
    stale["assistantWallet"]["activeVersionId"] = json!("assistant-version-2");
    seams.set_blockchain_config(stale);
    push_devnet_genesis(&seams);
    assert_eq!(
        body(handle(&seams, &request()).unwrap())["output"]["status"],
        "stale_wallet_version"
    );
    assert_eq!(signer_payloads(&seams).len(), 1);

    let changed = FakeSeams::new();
    changed.set_blockchain_config(fixture.config("active", true));
    queue_prepare(&changed, &fixture, fixture.discovery());
    changed.push_provider_error("timeout");
    let _ = handle(&changed, &request()).unwrap();
    push_devnet_genesis(&changed);
    changed.push_http_response(
        402,
        &fixture
            .discovery_with("devnet", AMOUNT - 1, Value::Null)
            .to_string(),
    );
    assert_eq!(
        body(handle(&changed, &request()).unwrap())["output"]["failureCode"],
        "changed_requirement"
    );
    assert_eq!(signer_payloads(&changed).len(), 1);
    let requests_after_changed_requirement = changed.http_requests.borrow().len();
    let changed_replay = body(handle(&changed, &request()).unwrap());
    assert_eq!(
        changed_replay["output"]["failureCode"],
        "changed_requirement"
    );
    assert_eq!(changed_replay["replayed"], true);
    assert_eq!(
        changed.http_requests.borrow().len(),
        requests_after_changed_requirement
    );

    let mut mismatch = request();
    mismatch.body = json!({"resourceUrl":TARGET,"maxAmountMicrounits":AMOUNT - 1}).to_string();
    assert_eq!(
        body(handle(&changed, &mismatch).unwrap())["output"]["failureCode"],
        "replay_mismatch"
    );
    assert_eq!(signer_payloads(&changed).len(), 1);
}

#[test]
fn changed_wallet_payer_or_cluster_cannot_resume_with_another_authority() {
    let fixture = Fixture::new();
    for mutation in ["wallet", "payer", "cluster"] {
        let seams = FakeSeams::new();
        seams.set_blockchain_config(fixture.config("active", true));
        queue_prepare(&seams, &fixture, fixture.discovery());
        seams.push_provider_error("timeout");
        let _ = handle(&seams, &request()).unwrap();
        let mut changed = fixture.config("active", true);
        match mutation {
            "wallet" => changed["assistantWallet"]["vaultWalletId"] = json!("another-wallet-id"),
            "payer" => {
                changed["assistantWallet"]["publicKey"] =
                    json!(bs58::encode([44_u8; 32]).into_string())
            }
            "cluster" => {
                changed["assistantWallet"]["cluster"] = json!("mainnet-beta");
                changed["solana"]["network"] = json!("mainnet-beta");
            }
            _ => unreachable!(),
        }
        seams.set_blockchain_config(changed);
        if mutation != "cluster" {
            push_devnet_genesis(&seams);
        } else {
            seams.push_http_response(
                200,
                &rpc(json!("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d")),
            );
        }
        let result = body(handle(&seams, &request()).unwrap());
        let expected = match mutation {
            "wallet" => "wrong_wallet",
            "payer" => "payer_mismatch",
            "cluster" => "cluster_mismatch",
            _ => unreachable!(),
        };
        assert_eq!(result["output"]["failureCode"], expected);
        assert_eq!(signer_payloads(&seams).len(), 1);
    }
}

#[test]
fn low_level_or_wrongly_authenticated_arguments_never_reach_wallet_or_network() {
    let fixture = Fixture::new();
    let seams = FakeSeams::new();
    seams.set_blockchain_config(fixture.config("active", true));
    let mut unsafe_body = request();
    unsafe_body.body = json!({
        "resourceUrl":TARGET,
        "maxAmountMicrounits":AMOUNT,
        "walletId":"operational-wallet-id",
        "serializedTransactionBase64":"model-controlled",
    })
    .to_string();
    assert_eq!(handle(&seams, &unsafe_body).unwrap_err().status, 422);
    let mut padded_target = request();
    padded_target.body = json!({"resourceUrl":format!(" {TARGET} ")}).to_string();
    assert_eq!(handle(&seams, &padded_target).unwrap_err().status, 422);
    let mut wrong_assistant = request();
    wrong_assistant.context_json = wrong_assistant
        .context_json
        .replace("ai-assistant", "another-assistant");
    assert_eq!(handle(&seams, &wrong_assistant).unwrap_err().status, 403);
    assert!(seams.provider_requests.borrow().is_empty());
    assert!(seams.http_requests.borrow().is_empty());
}

#[test]
fn tampered_persisted_purchase_never_reaches_signing_or_submission() {
    for (field, replacement) in [
        ("resourceUrl", json!("https://attacker.example/drain")),
        ("requestId", json!("another-request")),
        ("amountMicrounits", json!(AMOUNT + 1)),
        ("unsignedWireBase64", json!("AAAA")),
        ("transactionSha256", json!("00".repeat(32))),
        ("memo", json!("substituted memo")),
        ("signature", json!(bs58::encode([9_u8; 64]).into_string())),
    ] {
        let fixture = Fixture::new();
        let seams = FakeSeams::new();
        seams.set_blockchain_config(fixture.config("active", true));
        queue_prepare(&seams, &fixture, fixture.discovery());
        seams.push_provider_error("Vault timeout");
        assert_eq!(
            body(handle(&seams, &request()).unwrap())["output"]["status"],
            "ambiguous"
        );
        let key = store::key(IDEMPOTENCY_KEY);
        let mut stored = seams.get_entry(ids::MODEL_SUPPORT_AI, &key).unwrap();
        stored[field] = replacement;
        seams.seed(ids::MODEL_SUPPORT_AI, &key, stored);
        push_devnet_genesis(&seams);
        let before = seams.http_requests.borrow().len();
        assert_eq!(
            handle(&seams, &request()).unwrap_err().status,
            409,
            "field: {field}"
        );
        assert_eq!(signer_payloads(&seams).len(), 1, "field: {field}");
        assert!(
            seams.http_requests.borrow().len() <= before + 1,
            "only cluster verification may run"
        );
    }
}

#[test]
fn merchant_rejection_after_receiving_signed_payment_is_ambiguous() {
    let fixture = Fixture::new();
    let seams = FakeSeams::new();
    seams.set_blockchain_config(fixture.config("active", true));
    queue_prepare(&seams, &fixture, fixture.discovery());
    let (response, _, signed) = fixture.signer_response();
    seams.push_provider_response(response);
    seams.push_http_response(403, r#"{"error":"denied after broadcast"}"#);
    seams.push_http_response(200, &rpc(json!({"value":[null]})));
    let output = body(handle(&seams, &request()).unwrap());
    assert_eq!(output["output"]["status"], "ambiguous");
    push_devnet_genesis(&seams);
    seams.push_http_response(
        200,
        &rpc(json!({"value":[{"confirmationStatus":"finalized","err":null}]})),
    );
    seams.push_http_response(
        200,
        &rpc(crate::x402::rpc_fixtures::transaction_result(
            &signed,
            Value::Null,
            &fixture.merchant,
        )),
    );
    let output = body(handle(&seams, &request()).unwrap());
    assert_eq!(output["output"]["status"], "confirmed");
    assert_eq!(signer_payloads(&seams).len(), 1);
}
