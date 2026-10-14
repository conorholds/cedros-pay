use serde_json::Value;

use super::ClientCartItem;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::seams::HostSeams;

#[derive(Clone, Debug)]
pub(super) struct InventoryCheck {
    pub resource: String,
    pub variant_id: Option<String>,
    pub catalog_version: String,
    pub available: Option<u64>,
    pub condition: GuardedCondition,
}

pub(super) fn resolve<S: HostSeams>(
    db: &Db<'_, S>,
    product: &Value,
    item: &ClientCartItem,
    catalog_version: String,
) -> AppResult<InventoryCheck> {
    let fence = crate::checkout_contract::inventory_admin::read_fence(
        db,
        &item.resource,
        item.variant_id.as_deref(),
    )?;
    match fence.available {
        Some(available) if available < item.qty => return Err(unavailable()),
        Some(_) => {}
        None if explicitly_untracked(product, item.variant_id.as_deref())? => {}
        None => {
            return Err(AppError::new(
                503,
                "inventory_authority_unavailable",
                "cart item has no authoritative inventory aggregate",
            ));
        }
    }
    Ok(InventoryCheck {
        resource: item.resource.clone(),
        variant_id: item.variant_id.clone(),
        catalog_version,
        available: fence.available,
        condition: fence.condition,
    })
}

pub(super) fn guard_conditions(checks: &[InventoryCheck]) -> AppResult<Vec<GuardedCondition>> {
    let mut catalog_versions = std::collections::BTreeMap::new();
    for check in checks {
        if catalog_versions
            .insert(check.resource.clone(), check.catalog_version.clone())
            .is_some_and(|version| version != check.catalog_version)
        {
            return Err(AppError::conflict(
                "catalog changed while resolving the cart mutation",
            ));
        }
    }
    let mut conditions = checks
        .iter()
        .map(|check| check.condition.clone())
        .collect::<Vec<_>>();
    conditions.extend(
        catalog_versions
            .into_iter()
            .map(|(resource, expected_version)| GuardedCondition::Version {
                content_model_id: crate::ids::MODEL_CATALOG,
                entry_key: resource,
                expected_version,
            }),
    );
    Ok(conditions)
}

pub(super) fn ensure_final_quantities(
    cart: &super::storage::CartRecord,
    checks: &[InventoryCheck],
) -> AppResult<()> {
    for check in checks {
        let key = super::identity::line_key(&check.resource, check.variant_id.as_deref());
        let quantity = cart
            .lines
            .get(&key)
            .ok_or_else(|| AppError::internal("resolved cart inventory line is missing"))?
            .quantity;
        if check
            .available
            .is_some_and(|available| available < quantity)
        {
            return Err(unavailable());
        }
    }
    Ok(())
}

fn explicitly_untracked(product: &Value, variant_id: Option<&str>) -> AppResult<bool> {
    let target = match variant_id {
        Some(variant_id) => product
            .get("variants")
            .and_then(Value::as_array)
            .and_then(|variants| {
                variants
                    .iter()
                    .find(|variant| variant.get("id").and_then(Value::as_str) == Some(variant_id))
            })
            .ok_or_else(|| AppError::unprocessable("cart variant was not found"))?,
        None => product,
    };
    match target.get("inventoryPolicy") {
        Some(Value::String(policy)) => Ok(policy == "untracked"),
        Some(_) => Err(AppError::internal(
            "catalog inventory policy must be a string",
        )),
        None => Ok(false),
    }
}

fn unavailable() -> AppError {
    AppError::new(
        409,
        "inventory_unavailable",
        "requested cart quantity is unavailable",
    )
}
