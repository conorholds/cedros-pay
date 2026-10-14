#[test]
fn initial_collection_requires_a_host_managed_signer_without_reading_secrets() {
    let s = FakeSeams::new();
    let terms = prepare_terms(&s);
    configure_login(&s, "user_1");
    queue_authorization_proof(&s, &terms);
    let before = s.entry_count(ids::MODEL_LEDGER);

    let error = collect_initial(&s, &terms).unwrap_err();

    assert_eq!(error.status, 503);
    assert_eq!(error.code, "collector_signer_unavailable");
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), before);
    assert!(s.secret_reads.borrow().is_empty());
}

fn collect_initial(s: &FakeSeams, terms: &Value) -> AppResult<RouteResponse> {
    let authorization_signature = valid_signature(7);
    let mut request = req(
        ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_COLLECT_INITIAL,
        "POST",
        "/paywall/v1/subscription/solana-subscription/collect-initial",
    );
    request.body = json!({
        "planId": "pro", "interval": "monthly", "wallet": terms["wallet"],
        "authorizationSignature": authorization_signature,
        "walletBindingMessage": wallet_binding_message(terms, &authorization_signature),
        "walletBindingSignature": wallet_binding_signature(terms, &authorization_signature),
        "subscriptionAddress": terms["subscriptionAddress"],
        "subscriptionAuthorityAddress": terms["subscriptionAuthorityAddress"],
        "planAddress": terms["planAddress"], "numberOfPayments": 6
    })
    .to_string();
    handle(s, &request)
}

fn wallet_binding_message(terms: &Value, authorization_signature: &str) -> String {
    solana_wallet_binding::message(&solana_wallet_binding::WalletBinding {
        user_id: "user_1",
        plan_id: "pro",
        interval: "monthly",
        wallet: terms["wallet"].as_str().unwrap(),
        subscription_address: terms["subscriptionAddress"].as_str().unwrap(),
        authorization_signature,
    })
}

fn wallet_binding_signature(terms: &Value, authorization_signature: &str) -> String {
    use ed25519_dalek::{Signer, SigningKey};
    let signing = SigningKey::from_bytes(&SUBSCRIBER_SEED);
    bs58::encode(
        signing
            .sign(wallet_binding_message(terms, authorization_signature).as_bytes())
            .to_bytes(),
    )
    .into_string()
}
