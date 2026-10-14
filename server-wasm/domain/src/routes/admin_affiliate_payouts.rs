//! Pay-owned affiliate payout settlement contract for the host-mounted route.

use crate::error::{AppError, AppResult};
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::verify_relying_party;
use crate::seams::HostSeams;
use serde::Deserialize;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: crate::ids::ROUTE_ADMIN_AFFILIATE_PAYOUTS_SETTLE,
    method: "POST",
    path: "/admin/affiliate-payouts/settlements",
}];

const IDEMPOTENCY_PREFIX: &str = "affiliate-payout-settlement:";
const MAX_BATCH_ID_LEN: usize = 128;
const MAX_TEXT_FIELD_LEN: usize = 256;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettlementRequest {
    batch_id: String,
    items: Vec<SettlementItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettlementItem {
    payout_id: String,
    affiliate_user_id: String,
    pay_destination_id: String,
    amount: i64,
    currency: String,
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::routes::matches(req, "POST", "/admin/affiliate-payouts/settlements")
        .then_some(())
        .ok_or_else(|| AppError::not_found("unknown affiliate payout route"))?;
    verify_relying_party(seams, req)?;

    let body: SettlementRequest = serde_json::from_value(req.json_body()?)
        .map_err(|e| invalid_field("invalid settlement request").with_internal(e.to_string()))?;
    validate_request(req, &body)?;

    // Core can durably accept payout operations, but Pay cannot yet validate a
    // stored destination or execute the provider call. A 202 would create work
    // no Pay worker can finish. Fail closed until the complete executor ships.
    Err(AppError::new(
        503,
        "affiliate_payout_settlement_unavailable",
        "affiliate payout settlement is unavailable until Pay can execute accepted operations",
    ))
}

fn validate_request(req: &RouteRequest, body: &SettlementRequest) -> AppResult<()> {
    validate_batch_id(&body.batch_id)?;
    validate_idempotency_header(req, &body.batch_id)?;
    if body.items.is_empty() {
        return Err(invalid_field("items must contain at least one payout"));
    }
    for item in &body.items {
        validate_item(item)?;
    }
    Ok(())
}

fn validate_idempotency_header(req: &RouteRequest, batch_id: &str) -> AppResult<()> {
    let value = req
        .header("Idempotency-Key")
        .ok_or_else(|| invalid_field("Idempotency-Key is required"))?;
    let expected = format!("{IDEMPOTENCY_PREFIX}{batch_id}");
    if value != expected {
        return Err(invalid_field(
            "Idempotency-Key must equal affiliate-payout-settlement:{batchId}",
        ));
    }
    Ok(())
}

fn validate_batch_id(value: &str) -> AppResult<()> {
    validate_text_field("batchId", value, MAX_BATCH_ID_LEN)?;
    validate_safe_identifier("batchId", value)
}

fn validate_item(item: &SettlementItem) -> AppResult<()> {
    validate_text_field("payoutId", &item.payout_id, MAX_TEXT_FIELD_LEN)?;
    validate_text_field(
        "affiliateUserId",
        &item.affiliate_user_id,
        MAX_TEXT_FIELD_LEN,
    )?;
    validate_text_field(
        "payDestinationId",
        &item.pay_destination_id,
        MAX_TEXT_FIELD_LEN,
    )?;
    validate_text_field("currency", &item.currency, 16)?;
    validate_safe_identifier("payoutId", &item.payout_id)?;
    validate_safe_identifier("affiliateUserId", &item.affiliate_user_id)?;
    validate_safe_identifier("payDestinationId", &item.pay_destination_id)?;
    validate_currency(&item.currency)?;
    if item.amount <= 0 {
        return Err(invalid_field("amount must be positive atomic units"));
    }
    Ok(())
}

fn validate_text_field(field: &str, value: &str, limit: usize) -> AppResult<()> {
    if value.trim().is_empty() {
        return Err(invalid_field(format!("{field} is required")));
    }
    if value.len() > limit {
        return Err(invalid_field(format!("{field} exceeds {limit} characters")));
    }
    Ok(())
}

fn validate_safe_identifier(field: &str, value: &str) -> AppResult<()> {
    if value
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | ':' | '.'))
    {
        return Ok(());
    }
    Err(invalid_field(format!(
        "{field} contains unsupported characters"
    )))
}

fn validate_currency(value: &str) -> AppResult<()> {
    if value
        .chars()
        .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit())
    {
        return Ok(());
    }
    Err(invalid_field(
        "currency must use uppercase asset code characters",
    ))
}

fn invalid_field(message: impl Into<String>) -> AppError {
    AppError::new(400, "invalid_field", message)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;
    use crate::ids;
    use crate::reqresp::RouteRequest;
    use serde_json::{json, Value};

    fn seeded() -> FakeSeams {
        let s = FakeSeams::new();
        s.set_secret(ids::SECRET_RP_TOKEN, "cedros-pay-service-token");
        s
    }

    fn request(batch_id: &str, body: Value) -> RouteRequest {
        RouteRequest {
            route_id: ids::ROUTE_ADMIN_AFFILIATE_PAYOUTS_SETTLE.into(),
            method: "POST".into(),
            path: "/extensions/cedros-pay/admin/affiliate-payouts/settlements".into(),
            headers: vec![
                (
                    "authorization".into(),
                    "Bearer cedros-pay-service-token".into(),
                ),
                (
                    "Idempotency-Key".into(),
                    format!("{IDEMPOTENCY_PREFIX}{batch_id}"),
                ),
            ],
            body: body.to_string(),
            ..Default::default()
        }
    }

    #[test]
    fn mounted_route_fails_closed_without_pay_payout_execution() {
        let req = request(
            "batch-2026-06-20",
            json!({
                "batchId": "batch-2026-06-20",
                "items": [{
                    "payoutId": "payout_123",
                    "affiliateUserId": "user_123",
                    "payDestinationId": "paydest_123",
                    "amount": 1000,
                    "currency": "USDC"
                }]
            }),
        );
        let seams = seeded();
        let err = handle(&seams, &req).unwrap_err();

        assert_eq!(err.status, 503);
        assert_eq!(err.code, "affiliate_payout_settlement_unavailable");
    }

    #[test]
    fn mismatched_idempotency_key_returns_invalid_field() {
        let mut req = request(
            "other-batch",
            json!({
                "batchId": "batch-2026-06-20",
                "items": [{
                    "payoutId": "payout_123",
                    "affiliateUserId": "user_123",
                    "payDestinationId": "paydest_123",
                    "amount": 1000,
                    "currency": "USDC"
                }]
            }),
        );
        req.headers = vec![
            (
                "authorization".into(),
                "Bearer cedros-pay-service-token".into(),
            ),
            (
                "Idempotency-Key".into(),
                "affiliate-payout-settlement:other-batch".into(),
            ),
        ];
        let seams = seeded();
        let err = handle(&seams, &req).unwrap_err();

        assert_eq!(err.status, 400);
        assert_eq!(err.code, "invalid_field");
    }

    #[test]
    fn missing_service_token_is_unauthorized() {
        let mut req = request(
            "batch-2026-06-20",
            json!({
                "batchId": "batch-2026-06-20",
                "items": [{
                    "payoutId": "payout_123",
                    "affiliateUserId": "user_123",
                    "payDestinationId": "paydest_123",
                    "amount": 1000,
                    "currency": "USDC"
                }]
            }),
        );
        req.headers
            .retain(|(name, _)| !name.eq_ignore_ascii_case("authorization"));
        let seams = seeded();
        let err = handle(&seams, &req).unwrap_err();

        assert_eq!(err.status, 401);
        assert_eq!(err.code, "unauthorized");
    }
}
