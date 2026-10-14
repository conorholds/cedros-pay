use super::inventory_hold_builder::build_hold;
use super::inventory_storage::write;
use super::inventory_types::{
    hold_key, stock_key, CatalogGuard, InventoryHoldSnapshot, InventoryReservationContext,
    PreparedStock, StockIntent, StockRecord,
};
use super::record::OperationRecord;
use super::{
    CanonicalOperationContext, CheckoutAttemptId, CustomerContextHashes, OperationIdentity,
    OperationLedger, INVENTORY_HOLD_MODEL, OPERATION_MODEL, STOCK_MODEL,
};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

const MAX_CONDITIONS: usize = 32;
// Checkout, quote, hold, provider ledger, order, and settlement effect guards.
const SETTLEMENT_FIXED_CONDITIONS: usize = 6;

pub(super) struct QuoteCommit {
    pub snapshot: super::AuthoritativeQuoteSnapshot,
    pub hashes: CustomerContextHashes,
    pub intents: Vec<StockIntent>,
    pub catalog_guards: Vec<CatalogGuard>,
    pub regional_policy: crate::regional_payment_policy::RegionalPolicyBinding,
    pub physical_storefront: bool,
}

pub(super) fn commit_quote<S: HostSeams>(
    ledger: &OperationLedger<'_, S>,
    identity: &OperationIdentity,
    attempt: &CheckoutAttemptId,
    input: QuoteCommit,
) -> AppResult<GuardedBatchOutcome> {
    let QuoteCommit {
        mut snapshot,
        hashes,
        mut intents,
        mut catalog_guards,
        regional_policy,
        physical_storefront,
    } = input;
    intents.sort_by_key(|intent| stock_key(&intent.resource, intent.variant_id.as_deref()));
    catalog_guards.sort_by(|left, right| left.resource.cmp(&right.resource));
    let db = Db::new(ledger.seams, crate::ids::DB_ACCESS);
    let stocks = intents
        .iter()
        .map(|intent| prepare_stock(&db, intent, ledger.now()))
        .collect::<AppResult<Vec<_>>>()?;
    let operation_id = identity.public_operation_id();
    let expires_at = crate::time::parse_iso(&snapshot.expires_at)
        .ok_or_else(|| AppError::internal("quote expiry is invalid"))?;
    let hold = (!stocks.is_empty()).then(|| {
        build_hold(
            identity.provider_scope(),
            &operation_id,
            expires_at,
            ledger.now(),
            &stocks,
        )
    });
    let reservation = hold.as_ref().map(|hold| InventoryReservationContext {
        hold_id: hold_key(&hold.provider_scope, &hold.quote_operation_id),
        lines: hold.lines.clone(),
    });
    snapshot.inventory_hold = reservation
        .as_ref()
        .map(|reservation| InventoryHoldSnapshot {
            hold_id: reservation.hold_id.clone(),
            expires_at: snapshot.expires_at.clone(),
        });
    let context = CanonicalOperationContext::Quote {
        snapshot: Box::new(snapshot),
        customer_context_hashes: hashes,
        inventory_reservation: reservation,
        regional_policy: Some(regional_policy),
    };
    let record = OperationRecord::resolved_quote(identity, attempt, context, ledger.now());
    let mut conditions = vec![GuardedCondition::Absent {
        content_model_id: OPERATION_MODEL,
        entry_key: identity.entry_key().into(),
    }];
    conditions.extend(
        catalog_guards
            .into_iter()
            .map(|guard| GuardedCondition::Version {
                content_model_id: crate::ids::MODEL_CATALOG,
                entry_key: guard.resource,
                expected_version: guard.version,
            }),
    );
    let mut ops = vec![write(OPERATION_MODEL, identity.entry_key(), &record)?];
    if let Some(hold) = hold {
        let key = hold_key(&hold.provider_scope, &hold.quote_operation_id);
        conditions.push(GuardedCondition::Absent {
            content_model_id: INVENTORY_HOLD_MODEL,
            entry_key: key.clone(),
        });
        conditions.extend(stocks.iter().map(|stock| stock.condition.clone()));
        ops.push(write(INVENTORY_HOLD_MODEL, &key, &hold)?);
        ops.extend(
            stocks
                .iter()
                .map(|stock| write(STOCK_MODEL, &stock.record.stock_key, &stock.record))
                .collect::<AppResult<Vec<_>>>()?,
        );
    }
    // Physical checkout reuses these catalog/profile guards and also guards
    // the quote it claims. Reserve that extra condition before issuing a quote.
    if conditions.len() + usize::from(physical_storefront) > MAX_CONDITIONS
        || stocks.len() > MAX_CONDITIONS - SETTLEMENT_FIXED_CONDITIONS
    {
        return Err(AppError::new(
            422,
            "inventory_condition_limit",
            "quote exceeds the 32-condition guarded inventory limit",
        ));
    }
    ledger.db.guarded_batch(&conditions, &ops)
}

fn prepare_stock<S: HostSeams>(
    db: &Db<'_, S>,
    intent: &StockIntent,
    now: i64,
) -> AppResult<PreparedStock> {
    let key = stock_key(&intent.resource, intent.variant_id.as_deref());
    let (mut record, condition) = match db.read_one(STOCK_MODEL, &key)? {
        Some(entry) => {
            let record: StockRecord = entry.parse()?;
            validate_stock(&record, &key, intent)?;
            (
                record,
                GuardedCondition::Version {
                    content_model_id: STOCK_MODEL,
                    entry_key: key.clone(),
                    expected_version: super::fence::required_version(&entry.version)?,
                },
            )
        }
        None => {
            let on_hand = intent.catalog_seed_on_hand.ok_or_else(|| {
                AppError::new(
                    503,
                    "inventory_authority_unavailable",
                    "tracked stock has no authoritative aggregate or catalog seed",
                )
            })?;
            (
                StockRecord {
                    schema_version: 1,
                    stock_key: key.clone(),
                    resource: intent.resource.clone(),
                    variant_id: intent.variant_id.clone(),
                    on_hand,
                    reserved: 0,
                    sold: 0,
                    updated_at: now,
                },
                GuardedCondition::Absent {
                    content_model_id: STOCK_MODEL,
                    entry_key: key.clone(),
                },
            )
        }
    };
    if record
        .available()
        .is_none_or(|available| available < intent.quantity)
    {
        return Err(AppError::new(
            409,
            "inventory_unavailable",
            "checkout inventory is unavailable",
        ));
    }
    record.reserved = record
        .reserved
        .checked_add(intent.quantity)
        .ok_or_else(|| AppError::unprocessable("inventory reservation overflowed"))?;
    record.updated_at = now;
    Ok(PreparedStock {
        record,
        condition,
        reservation_quantity: intent.quantity,
    })
}

fn validate_stock(record: &StockRecord, key: &str, intent: &StockIntent) -> AppResult<()> {
    if record.schema_version != 1
        || record.stock_key != key
        || record.resource != intent.resource
        || record.variant_id != intent.variant_id
        || record.available().is_none()
    {
        return Err(AppError::internal(
            "stored checkout stock violates its invariant",
        ));
    }
    Ok(())
}
