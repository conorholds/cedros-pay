use std::collections::BTreeSet;

use crate::error::{AppError, AppResult};

use super::settlement_effect_record::{
    SettlementEffectRecord, TargetKind, STATUS_DELIVERED, STATUS_LEASED, STATUS_PENDING,
};

pub(super) fn validate(record: &SettlementEffectRecord, max_products: usize) -> AppResult<()> {
    let valid = record.schema_version == 1
        && record.record_type == super::settlement_effect_record::RECORD_TYPE
        && prefixed_hash(&record.effect_id, "settlement-effect:")
        && safe_hash(&record.material_fingerprint)
        && safe_hash(&record.provider_reference_sha256)
        && record.operation_id.starts_with("payop_")
        && safe_text(&record.quote_operation_id)
        && record.amount_cents > 0
        && valid_currency(&record.currency)
        && record.subject_ref.as_deref().is_none_or(safe_text)
        && valid_times(record)
        && valid_identity(record)
        && record.targets.len() >= 2
        && record.targets.len() <= max_products + 3
        && valid_targets(record)
        && valid_status(record);
    valid
        .then_some(())
        .ok_or_else(|| AppError::internal("stored canonical settlement effect is invalid"))
}

fn valid_targets(record: &SettlementEffectRecord) -> bool {
    let mut ids = BTreeSet::new();
    let valid = record.targets.iter().all(|target| {
        ids.insert(&target.id)
            && prefixed_hash(&target.id, "effect-target:")
            && target.product_id.as_deref().is_none_or(safe_text)
            && target.id == expected_target_id(record, target)
            && target_shape(record, target)
    });
    valid
        && count(record, TargetKind::PaymentAnalytics) == 1
        && count(record, TargetKind::CheckoutSettled) == 1
        && count(record, TargetKind::CrmPurchase) == usize::from(record.subject_ref.is_some())
}

fn expected_target_id(
    record: &SettlementEffectRecord,
    target: &super::settlement_effect_record::EffectTarget,
) -> String {
    let name = match target.kind {
        TargetKind::PaymentAnalytics => "analytics",
        TargetKind::CheckoutSettled => "settled",
        TargetKind::Entitlement => "entitlement",
        TargetKind::CrmPurchase => "crm",
    };
    super::settlement_effect_identity::target_id(
        &record.effect_id,
        name,
        target.product_id.as_deref(),
    )
}

fn target_shape(
    record: &SettlementEffectRecord,
    target: &super::settlement_effect_record::EffectTarget,
) -> bool {
    match target.kind {
        TargetKind::Entitlement => target.product_id.is_some(),
        TargetKind::CrmPurchase => target.product_id.is_none() && record.subject_ref.is_some(),
        TargetKind::PaymentAnalytics | TargetKind::CheckoutSettled => target.product_id.is_none(),
    }
}

fn count(record: &SettlementEffectRecord, kind: TargetKind) -> usize {
    record
        .targets
        .iter()
        .filter(|target| target.kind == kind)
        .count()
}

fn valid_status(record: &SettlementEffectRecord) -> bool {
    match record.status.as_str() {
        STATUS_PENDING => record.lease_owner.is_none() && record.lease_expires_at.is_none(),
        STATUS_LEASED => {
            record.lease_owner.as_deref().is_some_and(safe_text)
                && record
                    .lease_expires_at
                    .as_deref()
                    .and_then(crate::time::parse_iso)
                    .is_some()
        }
        STATUS_DELIVERED => {
            record.all_delivered()
                && record.lease_owner.is_none()
                && record.lease_expires_at.is_none()
        }
        _ => false,
    }
}

fn valid_currency(value: &str) -> bool {
    value.len() == 3 && value.bytes().all(|byte| byte.is_ascii_uppercase())
}

fn valid_identity(record: &SettlementEffectRecord) -> bool {
    record.effect_id
        == super::settlement_effect_identity::effect_id(
            &record.operation_id,
            &record.quote_operation_id,
            &record.material_fingerprint,
            &record.provider_reference_sha256,
            record.rail,
        )
}

fn valid_times(record: &SettlementEffectRecord) -> bool {
    [
        &record.created_at,
        &record.updated_at,
        &record.next_attempt_at,
    ]
    .iter()
    .all(|value| crate::time::parse_iso(value).is_some())
}

fn prefixed_hash(value: &str, prefix: &str) -> bool {
    value.strip_prefix(prefix).is_some_and(safe_hash)
}

fn safe_hash(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn safe_text(value: &str) -> bool {
    !value.is_empty() && value.len() <= 512 && !value.chars().any(char::is_control)
}
