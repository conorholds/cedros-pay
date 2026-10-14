use super::inventory_storage::write;
use super::inventory_types::{HoldStatus, StockRecord};
use super::{SettlementExtras, INVENTORY_HOLD_MODEL, STOCK_MODEL};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::seams::HostSeams;

pub(super) fn expired_quote<S: HostSeams>(
    seams: &S,
    provider_scope: &str,
    quote_operation_id: &str,
    reservation: &super::inventory_types::InventoryReservationContext,
) -> AppResult<()> {
    let extras = SettlementExtras::from_context(
        String::new(),
        &super::CanonicalOperationContext::Checkout {
            quote_operation_id: quote_operation_id.into(),
            quote_scope: provider_scope.into(),
            subject_ref: None,
            payment_method: super::PaymentMethod::Stripe,
            stripe_request: None,
            inventory_reservation: Some(reservation.clone()),
        },
    )?;
    transition_expired(seams, &extras)
}

pub(super) fn is_committed<S: HostSeams>(
    seams: &S,
    reservation: Option<&super::inventory_types::InventoryReservationContext>,
) -> AppResult<bool> {
    let Some(reservation) = reservation else {
        return Ok(true);
    };
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let (_, hold) = super::inventory_read::hold(&db, &reservation.hold_id)?;
    Ok(hold.status == HoldStatus::Committed)
}

fn transition_expired<S: HostSeams>(seams: &S, extras: &SettlementExtras) -> AppResult<()> {
    let Some(reservation) = extras.reservation() else {
        return Ok(());
    };
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let (_, hold) = super::inventory_read::hold(&db, &reservation.hold_id)?;
    if hold.status == HoldStatus::Released {
        return Ok(());
    }
    if hold.status != HoldStatus::Active || seams.now_unix_secs() <= hold.expires_at {
        return Err(AppError::conflict(
            "only an expired unbound quote hold can be reclaimed",
        ));
    }
    transition_active_release(seams, extras)
}

fn transition_active_release<S: HostSeams>(seams: &S, extras: &SettlementExtras) -> AppResult<()> {
    let Some(reservation) = extras.reservation() else {
        return Ok(());
    };
    for _ in 0..3 {
        let db = Db::new(seams, crate::ids::DB_ACCESS);
        let (hold_entry, mut hold) = super::inventory_read::hold(&db, &reservation.hold_id)?;
        if hold.status == HoldStatus::Released {
            return Ok(());
        }
        if hold.status != HoldStatus::Active || seams.now_unix_secs() <= hold.expires_at {
            return Err(AppError::conflict("inventory hold is not reclaimable"));
        }
        let mut conditions = vec![super::inventory_read::version_condition(
            INVENTORY_HOLD_MODEL,
            &hold_entry,
        )?];
        let stocks = transition_stocks(&db, &hold, seams.now_unix_secs())?;
        for (entry, _) in &stocks {
            conditions.push(super::inventory_read::version_condition(
                STOCK_MODEL,
                entry,
            )?);
        }
        hold.status = HoldStatus::Released;
        hold.updated_at = seams.now_unix_secs();
        let mut ops = vec![write(INVENTORY_HOLD_MODEL, &reservation.hold_id, &hold)?];
        ops.extend(
            stocks
                .iter()
                .map(|(_, stock)| write(STOCK_MODEL, &stock.stock_key, stock))
                .collect::<AppResult<Vec<_>>>()?,
        );
        if matches!(
            db.guarded_batch(&conditions, &ops)?,
            GuardedBatchOutcome::Applied { .. }
        ) {
            return Ok(());
        }
    }
    Err(AppError::conflict(
        "expired inventory hold changed repeatedly",
    ))
}

fn transition_stocks<S: HostSeams>(
    db: &Db<'_, S>,
    hold: &super::inventory_types::HoldRecord,
    now: i64,
) -> AppResult<Vec<(crate::db::EntryRecord, StockRecord)>> {
    hold.lines
        .iter()
        .map(|line| {
            let (entry, mut stock) = super::inventory_read::stock(db, &line.stock_key)?;
            if stock.reserved < line.quantity {
                return Err(AppError::internal("inventory hold stock is inconsistent"));
            }
            stock.reserved -= line.quantity;
            stock.updated_at = now;
            Ok((entry, stock))
        })
        .collect()
}
