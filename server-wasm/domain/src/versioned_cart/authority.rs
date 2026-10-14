use super::{
    validation, CartCommand, CartItemInput, CartMutation, CartWriteRequest, ClientCartItem,
    ClientCartMutation, ShopCartSnapshot,
};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::routes::coupons::CouponPurpose;
use crate::seams::HostSeams;

pub trait CartAuthority<S: HostSeams> {
    /// Resolves caller material and captures inventory fences for the cart write.
    fn resolve(&self, seams: &S, request: &CartWriteRequest) -> AppResult<ResolvedCartCommand>;
}

/// Server-resolved cart command with inventory checks bound to its commit.
pub struct ResolvedCartCommand {
    pub command: CartCommand,
    pub(super) inventory_checks: Vec<super::authority_inventory::InventoryCheck>,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct ProductionCartAuthority;

impl<S: HostSeams> CartAuthority<S> for ProductionCartAuthority {
    fn resolve(&self, seams: &S, request: &CartWriteRequest) -> AppResult<ResolvedCartCommand> {
        let policy = crate::native_storefront_policy::Policy::load(seams)?;
        let mut classifier = crate::native_storefront_policy::Classifier::new(seams);
        let db = Db::new(seams, ids::DB_ACCESS);
        let (mutation, inventory_checks) = match &request.mutation {
            ClientCartMutation::Add { item } => {
                let (item, check) = resolve_item(&db, item, policy, &mut classifier)?;
                (CartMutation::Add { item }, vec![check])
            }
            ClientCartMutation::SetQuantity { item } => {
                let (item, check) = resolve_item(&db, item, policy, &mut classifier)?;
                (CartMutation::SetItem { item }, vec![check])
            }
            ClientCartMutation::Remove {
                resource,
                variant_id,
            } => (
                CartMutation::Remove {
                    product_id: resource.clone(),
                    variant_id: variant_id.clone(),
                },
                Vec::new(),
            ),
            ClientCartMutation::ReplaceSnapshot { snapshot } => {
                let resolved = snapshot
                    .items
                    .iter()
                    .map(|item| resolve_item(&db, item, policy, &mut classifier))
                    .collect::<AppResult<Vec<_>>>()?;
                let (items, inventory_checks): (Vec<_>, Vec<_>) = resolved.into_iter().unzip();
                validate_promotion(seams, &items, snapshot.promo_code.as_deref())?;
                (
                    CartMutation::Replace {
                        snapshot: ShopCartSnapshot {
                            items,
                            promo_code: snapshot.promo_code.clone(),
                            promo_codes: snapshot.promo_codes.clone(),
                        },
                    },
                    inventory_checks,
                )
            }
            ClientCartMutation::Clear {} => (CartMutation::Clear {}, Vec::new()),
        };
        Ok(ResolvedCartCommand {
            command: CartCommand {
                lane: request.lane.clone(),
                generation: request.generation.clone(),
                expected_version: request.expected_version,
                operation_id: request.operation_id.clone(),
                mutation,
            },
            inventory_checks,
        })
    }
}

fn resolve_item<S: HostSeams>(
    db: &Db<'_, S>,
    item: &ClientCartItem,
    policy: crate::native_storefront_policy::Policy,
    classifier: &mut crate::native_storefront_policy::Classifier<'_, S>,
) -> AppResult<(CartItemInput, super::authority_inventory::InventoryCheck)> {
    let product = db
        .read_one(ids::MODEL_CATALOG, &item.resource)?
        .ok_or_else(|| AppError::not_found("cart product was not found"))?;
    if policy.is_physical() && !classifier.is_physical(&product.payload, &item.resource)? {
        return Err(crate::native_storefront_policy::restricted());
    }
    let catalog_version = product
        .version
        .clone()
        .filter(|version| !version.is_empty())
        .ok_or_else(|| AppError::internal("cart catalog item omitted its host revision"))?;
    let facts = crate::routes::products::catalog_item_authority_facts(
        &product.payload,
        &item.resource,
        item.variant_id.as_deref(),
    )?;
    let inventory =
        super::authority_inventory::resolve(db, &product.payload, item, catalog_version)?;
    let resolved = CartItemInput {
        product_id: item.resource.clone(),
        variant_id: item.variant_id.clone(),
        quantity: item.qty,
        unit_amount_cents: facts.unit_amount_cents,
        currency: facts.currency,
        title_snapshot: facts.title,
        image_snapshot: facts.image,
        payment_resource: Some(facts.payment_resource),
        metadata: item.display_metadata.clone(),
        hold_id: None,
        hold_expires_at: None,
    };
    validation::item_input(&resolved)?;
    Ok((resolved, inventory))
}

fn validate_promotion<S: HostSeams>(
    seams: &S,
    items: &[CartItemInput],
    code: Option<&str>,
) -> AppResult<()> {
    if code.is_none() {
        return Ok(());
    }
    let (subtotal, currency) = items
        .iter()
        .try_fold((0_i64, None::<&str>), |(subtotal, currency), item| {
            let line = item
                .unit_amount_cents
                .checked_mul(item.quantity)
                .and_then(|value| i64::try_from(value).ok())?;
            let currency = match currency {
                Some(current) if current != item.currency => return None,
                Some(current) => Some(current),
                None => Some(item.currency.as_str()),
            };
            Some((subtotal.checked_add(line)?, currency))
        })
        .ok_or_else(|| validation::invalid("cart promotion total is invalid"))?;
    let currency =
        currency.ok_or_else(|| validation::invalid("empty cart cannot use promotion"))?;
    crate::routes::coupons::apply_to_cents(
        seams,
        code,
        subtotal,
        currency,
        CouponPurpose::CartQuote,
    )?;
    Ok(())
}
