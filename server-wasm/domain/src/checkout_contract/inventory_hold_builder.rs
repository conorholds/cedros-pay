use super::inventory_types::{HoldLine, HoldRecord, HoldStatus, PreparedStock};

pub(super) fn build_hold(
    scope: &str,
    operation_id: &str,
    expires_at: i64,
    now: i64,
    stocks: &[PreparedStock],
) -> HoldRecord {
    HoldRecord {
        schema_version: 1,
        provider_scope: scope.into(),
        quote_operation_id: operation_id.into(),
        checkout_operation_id: None,
        status: HoldStatus::Active,
        lines: stocks
            .iter()
            .map(|stock| HoldLine {
                stock_key: stock.record.stock_key.clone(),
                resource: stock.record.resource.clone(),
                variant_id: stock.record.variant_id.clone(),
                quantity: stock.reservation_quantity,
            })
            .collect(),
        expires_at,
        updated_at: now,
    }
}
