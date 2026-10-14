use sha2::{Digest, Sha256};

use super::settlement_effect_record::{EffectTarget, TargetKind, TargetState};
use super::PaymentMethod;

pub(super) fn provider_hash(reference: &str) -> String {
    digest("provider-reference", &[reference])
}

pub(super) fn effect_id(
    operation_id: &str,
    quote_id: &str,
    material: &str,
    provider_hash: &str,
    rail: PaymentMethod,
) -> String {
    format!(
        "settlement-effect:{}",
        digest(
            "identity",
            &[
                operation_id,
                quote_id,
                material,
                provider_hash,
                rail_name(rail)
            ],
        )
    )
}

pub(super) fn base_targets(effect_id: &str, subject: Option<&str>) -> Vec<EffectTarget> {
    let mut targets = vec![
        target(effect_id, "analytics", TargetKind::PaymentAnalytics),
        target(effect_id, "settled", TargetKind::CheckoutSettled),
    ];
    if subject.is_some() {
        targets.push(target(effect_id, "crm", TargetKind::CrmPurchase));
    }
    targets
}

pub(super) fn entitlement_target(effect_id: &str, product_id: String) -> EffectTarget {
    EffectTarget {
        id: target_id(effect_id, "entitlement", Some(&product_id)),
        kind: TargetKind::Entitlement,
        product_id: Some(product_id),
        state: TargetState::Pending,
    }
}

fn target(effect_id: &str, name: &str, kind: TargetKind) -> EffectTarget {
    EffectTarget {
        id: target_id(effect_id, name, None),
        kind,
        product_id: None,
        state: TargetState::Pending,
    }
}

pub(super) fn target_id(effect_id: &str, name: &str, product: Option<&str>) -> String {
    format!(
        "effect-target:{}",
        digest("target", &[effect_id, name, product.unwrap_or("")])
    )
}

pub(super) fn rail_name(rail: PaymentMethod) -> &'static str {
    match rail {
        PaymentMethod::Stripe => "stripe",
        PaymentMethod::X402 => "x402",
        PaymentMethod::Credits => "credits",
    }
}

fn digest(domain: &str, values: &[&str]) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-canonical-settlement-effect-v1\0");
    digest.update(domain.as_bytes());
    for value in values {
        digest.update((value.len() as u64).to_be_bytes());
        digest.update(value.as_bytes());
    }
    hex::encode(digest.finalize())
}
