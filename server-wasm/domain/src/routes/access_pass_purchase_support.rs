use super::*;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct XPayment {
    payload: XPaymentPayload,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct XPaymentPayload {
    transaction: Option<String>,
}

pub(super) fn decode_payment(header: &str) -> AppResult<String> {
    let bytes = BASE64
        .decode(header.trim())
        .or_else(|_| STANDARD_NO_PAD.decode(header.trim()))
        .map_err(|_| AppError::new(400, "malformed_payment", "X-PAYMENT is not valid base64"))?;
    let payment: XPayment = serde_json::from_slice(&bytes)
        .map_err(|_| AppError::new(400, "malformed_payment", "X-PAYMENT is not valid JSON"))?;
    payment
        .payload
        .transaction
        .filter(|v| !v.trim().is_empty())
        .ok_or_else(|| AppError::new(400, "malformed_payment", "X-PAYMENT transaction is missing"))
}

pub(super) fn validate_public_key(value: &str) -> AppResult<()> {
    let bytes = bs58::decode(value)
        .into_vec()
        .map_err(|_| AppError::bad_request("delegatedPublicKey is invalid"))?;
    if bytes.len() == 32 {
        Ok(())
    } else {
        Err(AppError::bad_request(
            "delegatedPublicKey must encode 32 bytes",
        ))
    }
}

pub(super) fn random_id(prefix: &str) -> AppResult<String> {
    let mut bytes = [0u8; 24];
    getrandom::fill(&mut bytes).map_err(|error| {
        AppError::internal("secure randomness is unavailable").with_internal(error.to_string())
    })?;
    Ok(format!("{prefix}_{}", hex::encode(bytes)))
}

pub(super) fn short_hash(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))[..24].to_string()
}

pub(super) fn opaque(prefix: &str, value: &str) -> String {
    format!(
        "{prefix}_{}",
        hex::encode(Sha256::digest(
            format!("cedros-pay:{prefix}:{value}").as_bytes()
        ))
    )
}

pub(crate) fn subject_ref(payer_wallet: &str, delegated_key: &str) -> String {
    opaque("csub", &format!("{payer_wallet}:{delegated_key}"))
}

pub(super) fn challenge_key(value: &str) -> String {
    format!("challenge:{value}")
}

pub(super) fn version_guard(
    model: &'static str,
    row: &crate::db::EntryRecord,
) -> AppResult<GuardedCondition> {
    Ok(GuardedCondition::Version {
        content_model_id: model,
        entry_key: row.entry_key.clone(),
        expected_version: row
            .version
            .clone()
            .ok_or_else(|| AppError::internal("database entry omitted concurrency version"))?,
    })
}

pub(super) fn encode_error(error: serde_json::Error) -> AppError {
    AppError::internal("cannot encode access-pass state").with_internal(error.to_string())
}
