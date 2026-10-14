//! Expiry requires a previously observed valid blockhash, a rooted bank past
//! that observation, and a subsequent history read at least as fresh as that bank.

use super::rpc::{self, Confirmation, RpcError};
use crate::seams::HostSeams;
use serde_json::{json, Value};

pub fn observation(raw: &str) -> Result<(bool, u64), RpcError> {
    let result = rpc::parse_result(raw)?;
    let slot = context_slot(&result)?;
    let valid = result
        .get("value")
        .and_then(Value::as_bool)
        .ok_or_else(|| error("blockhash validity missing"))?;
    Ok((valid, slot))
}

pub fn expired<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    blockhash: &str,
    signature: &str,
    valid_at_slot: u64,
) -> Result<bool, RpcError> {
    let request = rpc::rpc_post(
        rpc_url,
        "isBlockhashValid",
        json!([
            blockhash, {"commitment":"finalized", "minContextSlot":valid_at_slot}
        ]),
    );
    let raw = seams
        .http_fetch(&request.to_string())
        .map_err(|_| error("expiry RPC unavailable"))?;
    let (valid, rooted_slot) = observation(&raw)?;
    if valid || rooted_slot < valid_at_slot {
        return Ok(false);
    }
    let raw = seams
        .http_fetch(&rpc::build_get_signature_statuses(rpc_url, signature).to_string())
        .map_err(|_| error("signature history unavailable"))?;
    if context_slot(&rpc::parse_result(&raw)?)? < rooted_slot {
        return Ok(false);
    }
    Ok(rpc::parse_signature_status(&raw)? == Confirmation::NotFound)
}

fn context_slot(result: &Value) -> Result<u64, RpcError> {
    result["context"]["slot"]
        .as_u64()
        .ok_or_else(|| error("RPC context slot missing"))
}

fn error(message: &str) -> RpcError {
    RpcError {
        code: 0,
        message: message.into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;
    fn reply(seams: &FakeSeams, result: Value) {
        seams.push_http_response(
            200,
            &json!({"jsonrpc":"2.0","id":1,"result":result}).to_string(),
        );
    }
    #[test]
    fn expiration_requires_rooted_invalidation_and_fresh_absence() {
        for (root, history, value, expected) in [
            (200, 200, Value::Null, true),
            (99, 200, Value::Null, false),
            (200, 199, Value::Null, false),
            (
                200,
                200,
                json!({"err":null,"confirmationStatus":"processed"}),
                false,
            ),
            (
                200,
                200,
                json!({"err":null,"confirmationStatus":"finalized"}),
                false,
            ),
        ] {
            let seams = FakeSeams::new();
            reply(&seams, json!({"context":{"slot":root},"value":false}));
            reply(&seams, json!({"context":{"slot":history},"value":[value]}));
            assert_eq!(
                expired(&seams, "https://rpc.example", "hash", "signature", 100),
                Ok(expected)
            );
            let requests = seams.http_requests.borrow();
            let body: Value = serde_json::from_str(requests[0]["body"].as_str().unwrap()).unwrap();
            assert_eq!(
                body["params"][1],
                json!({"commitment":"finalized","minContextSlot":100})
            );
        }
    }
    #[test]
    fn outages_missing_context_and_still_valid_hash_never_prove_expiry() {
        for value in [
            json!({"value":false}),
            json!({"context":{"slot":200},"value":true}),
        ] {
            let seams = FakeSeams::new();
            reply(&seams, value);
            assert_ne!(
                expired(&seams, "https://rpc.example", "hash", "signature", 100),
                Ok(true)
            );
        }
        assert!(expired(
            &FakeSeams::new(),
            "https://rpc.example",
            "hash",
            "signature",
            100
        )
        .is_err());
    }
}
