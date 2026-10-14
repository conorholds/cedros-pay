use super::*;

/// Wrap a JSON-RPC body in the `http_fetch` `{status,body}` envelope.
fn fetch(status: u16, rpc_body: Value) -> String {
    json!({ "status": status, "body": rpc_body.to_string() }).to_string()
}

#[test]
fn builds_jsonrpc_envelope_for_send() {
    let env = build_send_transaction("https://rpc.example", "BASE64TX");
    assert_eq!(env["method"], "POST");
    assert_eq!(env["url"], "https://rpc.example");
    let body: Value = serde_json::from_str(env["body"].as_str().unwrap()).unwrap();
    assert_eq!(body["method"], "sendTransaction");
    assert_eq!(body["params"][0], "BASE64TX");
    assert_eq!(body["params"][1]["encoding"], "base64");
}

#[test]
fn parses_latest_blockhash() {
    let blockhash = pubkey::encode(&[7; 32]);
    let raw = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"result":{"context":{"slot":1},"value":{"blockhash":blockhash,"lastValidBlockHeight":123}}}),
    );
    let bh = parse_latest_blockhash(&raw).unwrap();
    assert_eq!(bh.blockhash, blockhash);
    assert_eq!(bh.last_valid_block_height, 123);
}

#[test]
fn rejects_stale_or_malformed_blockhash_responses() {
    let missing_height = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"result":{"value":{"blockhash":pubkey::encode(&[7; 32]),"lastValidBlockHeight":0}}}),
    );
    assert!(parse_latest_blockhash(&missing_height).is_err());
    let malformed = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"result":{"value":{"blockhash":"not-a-blockhash","lastValidBlockHeight":123}}}),
    );
    assert!(parse_latest_blockhash(&malformed).is_err());
}

#[test]
fn binds_known_networks_to_canonical_genesis_hashes() {
    assert!(genesis_matches_network(MAINNET_BETA_GENESIS_HASH, "solana"));
    assert!(genesis_matches_network(
        MAINNET_BETA_GENESIS_HASH,
        "mainnet-beta"
    ));
    assert!(genesis_matches_network(DEVNET_GENESIS_HASH, "devnet"));
    assert!(!genesis_matches_network(
        DEVNET_GENESIS_HASH,
        "mainnet-beta"
    ));
    assert!(!genesis_matches_network(
        MAINNET_BETA_GENESIS_HASH,
        "localnet"
    ));
}

#[test]
fn confirmed_transaction_must_match_exact_signed_bytes() {
    let request = build_get_confirmed_transaction("https://rpc.example", "signature");
    let body: Value = serde_json::from_str(request["body"].as_str().unwrap()).unwrap();
    assert_eq!(body["method"], "getTransaction");
    assert_eq!(body["params"][1]["commitment"], "finalized");

    let transaction_base64 = crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO;
    let bytes = BASE64.decode(transaction_base64).unwrap();
    let parsed = transaction::parse(&bytes).unwrap();
    let signature = pubkey::encode_signature(&parsed.signatures[0]);
    let exact = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"result":crate::x402::rpc_fixtures::transaction_result(transaction_base64, serde_json::Value::Null, crate::x402::rpc_fixtures::MERCHANT)}),
    );
    assert_eq!(
        parse_confirmed_transaction(&exact, transaction_base64, &signature).unwrap(),
        ConfirmedTransaction::Succeeded
    );

    let modified = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"result":crate::x402::rpc_fixtures::transaction_result(crate::x402::transaction::fixtures::TRANSFER_CHECKED, serde_json::Value::Null, crate::x402::rpc_fixtures::MERCHANT)}),
    );
    assert!(parse_confirmed_transaction(&modified, transaction_base64, &signature).is_err());
}

#[test]
fn parses_send_signature() {
    let raw = fetch(200, json!({"jsonrpc":"2.0","id":1,"result":"SIG_ABC"}));
    assert_eq!(parse_send_transaction(&raw).unwrap(), "SIG_ABC");
}

#[test]
fn maps_rpc_error_with_code() {
    let raw = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"error":{"code":-32002,"message":"Transaction simulation failed"}}),
    );
    let err = parse_send_transaction(&raw).unwrap_err();
    assert_eq!(err.code, -32002);
    assert!(err.message.contains("simulation failed"));
}

#[test]
fn signature_status_variants() {
    let confirmed = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"confirmed","err":null}]}}),
    );
    assert_eq!(
        parse_signature_status(&confirmed).unwrap(),
        Confirmation::Confirmed
    );

    let not_found = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"result":{"value":[null]}}),
    );
    assert_eq!(
        parse_signature_status(&not_found).unwrap(),
        Confirmation::NotFound
    );

    let failed = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"result":{"value":[{"confirmationStatus":"finalized","err":{"InstructionError":[0,"Custom"]}}]}}),
    );
    assert!(matches!(
        parse_signature_status(&failed).unwrap(),
        Confirmation::Failed(_)
    ));
}

#[test]
fn parses_blockhash_validity_proof() {
    let valid = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"result":{"context":{"slot":1},"value":true}}),
    );
    let expired = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"result":{"context":{"slot":2},"value":false}}),
    );
    assert_eq!(parse_blockhash_valid(&valid), Ok(true));
    assert_eq!(parse_blockhash_valid(&expired), Ok(false));
}

#[test]
fn http_error_is_transport_error() {
    let raw = fetch(503, json!({}));
    assert_eq!(parse_result(&raw).unwrap_err().code, 0);
}

#[test]
fn finalized_effects_reject_missing_or_hostile_token_balances() {
    let wire = transaction::fixtures::TRANSFER_CHECKED_MEMO;
    let tx = transaction::parse(&BASE64.decode(wire).unwrap()).unwrap();
    let signature = pubkey::encode_signature(&tx.signatures[0]);
    let valid = crate::x402::rpc_fixtures::transaction_result(
        wire,
        Value::Null,
        crate::x402::rpc_fixtures::MERCHANT,
    );
    let parse = |result: Value| {
        parse_confirmed_transaction(
            &fetch(200, json!({"jsonrpc":"2.0","id":1,"result":result})),
            wire,
            &signature,
        )
    };
    assert_eq!(parse(valid.clone()), Ok(ConfirmedTransaction::Succeeded));
    for (pointer, value) in [
        ("/slot", Value::Null),
        ("/meta/err", json!("execution failed")),
        ("/meta/err", json!(false)),
        ("/meta/err", json!({})),
        ("/meta/preTokenBalances", Value::Null),
        ("/meta/postTokenBalances/1/uiTokenAmount/amount", json!("0")),
        (
            "/meta/postTokenBalances/1/uiTokenAmount/amount",
            json!("1499999"),
        ),
        (
            "/meta/postTokenBalances/1/uiTokenAmount/amount",
            json!("1500001"),
        ),
        (
            "/meta/postTokenBalances/1/uiTokenAmount/amount",
            json!("18446744073709551616"),
        ),
        (
            "/meta/postTokenBalances/1/uiTokenAmount/amount",
            json!(1_500_000),
        ),
        ("/meta/postTokenBalances/1/uiTokenAmount/decimals", json!(9)),
        (
            "/meta/postTokenBalances/1/mint",
            json!(crate::x402::config::DEVNET_USDC_MINT),
        ),
        (
            "/meta/postTokenBalances/1/programId",
            json!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
        ),
        (
            "/meta/postTokenBalances/1/owner",
            json!(transaction::fixtures::PAYER),
        ),
        ("/meta/postTokenBalances/0/uiTokenAmount/amount", json!("1")),
        (
            "/meta/postTokenBalances/0/owner",
            json!(crate::x402::rpc_fixtures::MERCHANT),
        ),
    ] {
        let mut hostile = valid.clone();
        *hostile.pointer_mut(pointer).unwrap() = value;
        assert_ne!(
            parse(hostile),
            Ok(ConfirmedTransaction::Succeeded),
            "{pointer}"
        );
    }
    let mut duplicate = valid.clone();
    let row = duplicate["meta"]["postTokenBalances"][1].clone();
    duplicate["meta"]["postTokenBalances"]
        .as_array_mut()
        .unwrap()
        .push(row);
    assert!(parse(duplicate).is_err());
    let mut missing_execution = valid;
    missing_execution["meta"]
        .as_object_mut()
        .unwrap()
        .remove("err");
    assert!(parse(missing_execution).is_err());
    assert_eq!(parse(Value::Null), Ok(ConfirmedTransaction::NotFound));
}

#[test]
fn malformed_status_is_neither_absence_nor_confirmation() {
    for result in [
        json!({}),
        json!({"value":[]}),
        json!({"value":[null,null]}),
        json!({"value":[{"confirmationStatus":"finalized"}]}),
        json!({"value":[{"err":null,"confirmationStatus":"unknown"}]}),
    ] {
        assert!(parse_signature_status(&fetch(
            200,
            json!({"jsonrpc":"2.0","id":1,"result":result})
        ))
        .is_err());
    }
    let unrooted_failure = fetch(
        200,
        json!({"jsonrpc":"2.0","id":1,"result":{"value":[{"err":{"InstructionError":[0,"Custom"]},"confirmationStatus":"processed"}]}}),
    );
    assert_eq!(
        parse_signature_status(&unrooted_failure),
        Ok(Confirmation::Processed)
    );
    for envelope in [
        json!({"jsonrpc":"2.0","id":2,"result":null}),
        json!({"result":null}),
        json!({"jsonrpc":"2.0","id":1,"result":null,"error":{"code":0}}),
    ] {
        assert!(parse_result(&fetch(200, envelope)).is_err());
    }
}
