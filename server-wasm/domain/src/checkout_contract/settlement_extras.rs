use super::inventory_storage::write;
use super::inventory_types::{HoldStatus, InventoryReservationContext};
use super::{CanonicalOperationContext, INVENTORY_HOLD_MODEL, STOCK_MODEL};
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::seams::HostSeams;

/// Rail-neutral guarded inventory effects consumed by every settlement adapter.
#[derive(Clone, Debug)]
pub(crate) struct SettlementExtras {
    provider_scope: String,
    quote_operation_id: String,
    checkout_operation_id: String,
    provider_expires_at: Option<i64>,
    reservation: Option<InventoryReservationContext>,
}

pub(super) struct ClaimPlan {
    pub conditions: Vec<GuardedCondition>,
    pub ops: Vec<BatchOp>,
}

impl SettlementExtras {
    pub(super) fn from_context(
        checkout_operation_id: String,
        context: &CanonicalOperationContext,
    ) -> AppResult<Self> {
        let CanonicalOperationContext::Checkout {
            quote_operation_id,
            quote_scope,
            inventory_reservation,
            stripe_request,
            ..
        } = context
        else {
            return Err(AppError::internal(
                "settlement extras require checkout context",
            ));
        };
        Ok(Self {
            provider_scope: quote_scope.clone(),
            quote_operation_id: quote_operation_id.clone(),
            checkout_operation_id,
            provider_expires_at: stripe_request.as_ref().map(|request| request.expires_at),
            reservation: inventory_reservation.clone(),
        })
    }

    pub(super) fn on_claim<S: HostSeams>(&self, db: &Db<'_, S>, now: i64) -> AppResult<ClaimPlan> {
        let Some(reservation) = &self.reservation else {
            return Ok(ClaimPlan {
                conditions: vec![],
                ops: vec![],
            });
        };
        let (entry, mut hold) = super::inventory_read::hold(db, &reservation.hold_id)?;
        super::inventory_read::validate_hold(
            &hold,
            &self.provider_scope,
            &self.quote_operation_id,
            reservation,
        )?;
        if hold.status != HoldStatus::Active || hold.checkout_operation_id.is_some() {
            return Err(AppError::conflict(
                "quote inventory hold is owned by another settlement",
            ));
        }
        if now > hold.expires_at {
            return Err(AppError::new(
                409,
                "inventory_hold_expired",
                "quote inventory hold has expired",
            ));
        }
        let mut conditions = vec![super::inventory_read::version_condition(
            INVENTORY_HOLD_MODEL,
            &entry,
        )?];
        for line in &hold.lines {
            let (entry, stock) = super::inventory_read::stock(db, &line.stock_key)?;
            if stock.reserved < line.quantity {
                return Err(AppError::internal("inventory hold stock is inconsistent"));
            }
            conditions.push(super::inventory_read::version_condition(
                STOCK_MODEL,
                &entry,
            )?);
        }
        let provider_expires_at = self
            .provider_expires_at
            .filter(|expires_at| *expires_at > now)
            .ok_or_else(|| AppError::internal("checkout provider expiry is invalid"))?;
        hold.checkout_operation_id = Some(self.checkout_operation_id.clone());
        hold.status = HoldStatus::CheckoutPending;
        hold.expires_at = provider_expires_at;
        hold.updated_at = now;
        Ok(ClaimPlan {
            conditions,
            ops: vec![write(INVENTORY_HOLD_MODEL, &reservation.hold_id, &hold)?],
        })
    }

    pub(super) fn reservation(&self) -> Option<&InventoryReservationContext> {
        self.reservation.as_ref()
    }
}
