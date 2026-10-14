use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::db::BatchOp;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;

use super::record::OperationRecord;
use super::{CanonicalOperationContext, PaymentMethod};

pub(super) const RECORD_TYPE: &str = "canonicalSettlementEffect";
pub(super) const STATUS_PENDING: &str = "effect_pending";
pub(super) const STATUS_LEASED: &str = "effect_leased";
pub(super) const STATUS_DELIVERED: &str = "effect_delivered";
const MAX_PRODUCTS: usize = 100;

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum TargetKind {
    PaymentAnalytics,
    CheckoutSettled,
    Entitlement,
    CrmPurchase,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum TargetState {
    Pending,
    Delivered,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct EffectTarget {
    pub id: String,
    pub kind: TargetKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub product_id: Option<String>,
    pub state: TargetState,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct SettlementEffectRecord {
    pub schema_version: u8,
    // Transaction assembly only: the immutable order is persisted separately
    // in the same guarded commit, never duplicated into delivery outbox payloads.
    #[serde(skip)]
    pub order: Option<crate::commerce_orders::Order>,
    pub record_type: String,
    pub effect_id: String,
    pub operation_id: String,
    pub quote_operation_id: String,
    pub material_fingerprint: String,
    pub provider_reference_sha256: String,
    pub rail: PaymentMethod,
    pub amount_cents: i64,
    pub currency: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subject_ref: Option<String>,
    pub targets: Vec<EffectTarget>,
    pub status: String,
    pub attempts: u32,
    pub next_attempt_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lease_owner: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lease_expires_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl SettlementEffectRecord {
    pub(super) fn build(
        checkout: &OperationRecord,
        quote: &OperationRecord,
        provider_reference: &str,
        now: i64,
    ) -> AppResult<Self> {
        let (quote_operation_id, subject_ref, rail) = checkout_context(checkout)?;
        let snapshot = quote_snapshot(quote)?;
        let provider_reference_sha256 =
            super::settlement_effect_identity::provider_hash(provider_reference);
        let effect_id = super::settlement_effect_identity::effect_id(
            &checkout.operation_id,
            quote_operation_id,
            &checkout.material_fingerprint,
            &provider_reference_sha256,
            rail,
        );
        let products = snapshot
            .lines
            .iter()
            .map(|line| line.payment_resource.clone())
            .collect::<BTreeSet<_>>();
        if products.len() > MAX_PRODUCTS {
            return Err(AppError::unprocessable(
                "settlement effect exceeds the product target limit",
            ));
        }
        let mut targets =
            super::settlement_effect_identity::base_targets(&effect_id, subject_ref.as_deref());
        targets.extend(products.into_iter().map(|product_id| {
            super::settlement_effect_identity::entitlement_target(&effect_id, product_id)
        }));
        let timestamp = crate::time::iso8601(now);
        let record = Self {
            schema_version: 1,
            order: crate::commerce_orders::Order::from_quote(
                snapshot,
                rail,
                if rail == PaymentMethod::Credits {
                    &checkout.operation_id
                } else {
                    provider_reference
                },
                checkout.created_at,
                now,
            )?,
            record_type: RECORD_TYPE.into(),
            effect_id,
            operation_id: checkout.operation_id.clone(),
            quote_operation_id: quote_operation_id.into(),
            material_fingerprint: checkout.material_fingerprint.clone(),
            provider_reference_sha256,
            rail,
            amount_cents: i64::try_from(snapshot.total_cents)
                .map_err(|_| AppError::unprocessable("quote total exceeds effect range"))?,
            currency: snapshot.currency.clone(),
            subject_ref,
            targets,
            status: STATUS_PENDING.into(),
            attempts: 0,
            next_attempt_at: timestamp.clone(),
            last_error: None,
            lease_owner: None,
            lease_expires_at: None,
            created_at: timestamp.clone(),
            updated_at: timestamp,
        };
        record.validate()?;
        Ok(record)
    }

    pub(super) fn validate(&self) -> AppResult<()> {
        super::settlement_effect_validation::validate(self, MAX_PRODUCTS)
    }

    pub(super) fn all_delivered(&self) -> bool {
        self.targets
            .iter()
            .all(|target| target.state == TargetState::Delivered)
    }

    /// Projects the trusted buyer and complete purchased-product set onto the
    /// durable commerce ledger row used by entitlement reads.
    pub(super) fn apply_ledger_entitlement_identity(
        &self,
        ledger: &mut crate::models::LedgerEntry,
    ) {
        let product_ids = self
            .targets
            .iter()
            .filter_map(|target| target.product_id.clone())
            .collect::<Vec<_>>();
        ledger.customer_profile_id = self.subject_ref.clone();
        ledger.product_id = product_ids.first().cloned();
        ledger.product_ids = product_ids;
    }
}

pub(super) fn absent_condition(record: &SettlementEffectRecord) -> GuardedCondition {
    GuardedCondition::Absent {
        content_model_id: crate::ids::MODEL_WEBHOOK_OUTBOX,
        entry_key: record.effect_id.clone(),
    }
}

pub(super) fn write(record: &SettlementEffectRecord) -> AppResult<BatchOp> {
    let data = serde_json::to_value(record).map_err(|error| {
        AppError::internal("cannot encode canonical settlement effect")
            .with_internal(error.to_string())
    })?;
    Ok(BatchOp::Write {
        content_model_id: crate::ids::MODEL_WEBHOOK_OUTBOX,
        entry_key: record.effect_id.clone(),
        data,
    })
}

fn checkout_context(
    checkout: &OperationRecord,
) -> AppResult<(&str, Option<String>, PaymentMethod)> {
    let subject_ref = super::record_rail::subject_ref(checkout)?.map(str::to_string);
    match &checkout.canonical_context {
        CanonicalOperationContext::Checkout {
            quote_operation_id,
            payment_method,
            ..
        } => Ok((quote_operation_id, subject_ref, *payment_method)),
        _ => Err(AppError::internal("checkout effect context is invalid")),
    }
}

fn quote_snapshot(quote: &OperationRecord) -> AppResult<&super::AuthoritativeQuoteSnapshot> {
    match &quote.canonical_context {
        CanonicalOperationContext::Quote { snapshot, .. } => Ok(snapshot),
        _ => Err(AppError::internal("checkout effect quote is invalid")),
    }
}
