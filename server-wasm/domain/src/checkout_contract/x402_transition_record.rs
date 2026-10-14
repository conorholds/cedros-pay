use super::record::{OperationRecord, SettlementState};
use super::{DurableOutcome, ProviderArtifacts};

pub(super) fn finalize(
    checkout: &mut OperationRecord,
    quote: &mut OperationRecord,
    target: &SettlementState,
    code: Option<&str>,
    signature: &str,
    effect: Option<&super::settlement_effect_record::SettlementEffectRecord>,
    now: i64,
) {
    checkout.outcome = Some(if *target == SettlementState::Paid {
        DurableOutcome::Resolved {
            operation_id: checkout.operation_id.clone(),
            checkout_attempt_id: checkout.checkout_attempt_id.clone(),
            provider_artifacts: ProviderArtifacts {
                provider_operation_id: Some(signature.into()),
                provider_payment_id: Some(signature.into()),
                outcome_proof: Some("x402-confirmed".into()),
                ..Default::default()
            },
            durable: true,
            replayed: false,
        }
    } else {
        DurableOutcome::Terminal {
            code: code.unwrap_or("x402-failed").into(),
            durable: true,
            replayed: false,
            outcome_proof: Some("x402-terminal".into()),
        }
    });
    checkout.settlement_state = target.clone();
    checkout.settlement_effect = Some(effect.map_or_else(
        || super::settlement_effect_store::terminal_intent(now),
        |effect| super::settlement_effect_store::paid_intent(effect, signature, now),
    ));
    checkout.updated_at = now;
    quote.settlement_state = target.clone();
    quote.updated_at = now;
}
