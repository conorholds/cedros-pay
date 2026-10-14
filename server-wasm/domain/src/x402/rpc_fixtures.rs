//! Deterministic RPC effects for signed test transactions. Tests mutate these
//! fields independently to exercise the settlement trust boundary.
use super::{pubkey, transaction, transfer};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde_json::{json, Value};

pub(crate) const MERCHANT: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

pub(crate) fn transaction_result(wire: &str, error: Value, merchant: &str) -> Value {
    let tx = transaction::parse(&BASE64.decode(wire).unwrap()).unwrap();
    let payment = transfer::extract_transfer(&tx).unwrap();
    let row = |key, owner: &str, amount: u64| {
        json!({
            "accountIndex": tx.account_keys.iter().position(|candidate| *candidate == key).unwrap(),
            "mint": pubkey::encode(&payment.mint), "owner": owner,
            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            "uiTokenAmount": {"amount": amount.to_string(), "decimals": payment.decimals, "uiAmount": null}
        })
    };
    let payer = pubkey::encode(&payment.authority);
    json!({"slot":100, "transaction":[wire,"base64"], "meta":{
        "err":error,
        "preTokenBalances":[row(payment.source, &payer, payment.amount), row(payment.destination, merchant, 0)],
        "postTokenBalances":[row(payment.source, &payer, 0), row(payment.destination, merchant, payment.amount)]
    }})
}
