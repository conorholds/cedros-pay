use sha2::{Digest, Sha256};
use std::collections::BTreeSet;

use super::api_request::QuoteItemIntent;
use super::inventory_types::{stock_key, CatalogGuard, StockIntent};
use super::{AuthoritativeQuoteLine, QuoteSource};
use crate::auth::Buyer;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::seams::HostSeams;
use crate::versioned_cart::{TrustedCartProvider, VersionedCartService};

pub(super) fn source_items<S: HostSeams>(
    seams: &S,
    buyer: Option<&Buyer>,
    cart_provider: Option<&TrustedCartProvider>,
    source: &QuoteSource,
) -> AppResult<(Vec<QuoteItemIntent>, Option<String>)> {
    match source {
        QuoteSource::Items { items } => Ok((items.clone(), None)),
        QuoteSource::VersionedCart {
            lane,
            generation,
            version,
        } => {
            let buyer = buyer.ok_or_else(cart_authority_unavailable)?;
            let provider = cart_provider
                .cloned()
                .ok_or_else(cart_authority_unavailable)?;
            let service = VersionedCartService::from_verified_buyer(seams, buyer, provider)?;
            let (current_generation, cart) = service.read_authoritative(lane)?;
            if current_generation.generation != *generation || cart.version != *version {
                return Err(AppError::new(
                    409,
                    "cart_changed",
                    "versioned cart token is stale",
                ));
            }
            let items = cart
                .lines
                .into_iter()
                .map(|line| QuoteItemIntent {
                    resource: line.product_id,
                    variant_id: line.variant_id,
                    qty: line.quantity,
                })
                .collect();
            Ok((items, cart.promo_code))
        }
    }
}

pub(super) struct ResolvedCatalog {
    pub lines: Vec<AuthoritativeQuoteLine>,
    pub stock_intents: Vec<StockIntent>,
    pub catalog_guards: Vec<CatalogGuard>,
}

pub(super) fn resolve_items<S: HostSeams>(
    seams: &S,
    items: &[QuoteItemIntent],
    domain_offer: Option<&super::domain_catalog::DomainCatalogOffer>,
) -> AppResult<ResolvedCatalog> {
    if let Some(offer) = domain_offer {
        return super::domain_catalog::resolve(seams, items, offer);
    }
    let policy = crate::native_storefront_policy::Policy::load(seams)?;
    let mut classifier = crate::native_storefront_policy::Classifier::new(seams);
    let db = Db::new(seams, ids::DB_ACCESS);
    let products = db.read_keys(
        ids::MODEL_CATALOG,
        &items
            .iter()
            .map(|item| item.resource.clone())
            .collect::<Vec<_>>(),
    )?;
    let stocks = db.read_keys(
        super::STOCK_MODEL,
        &items
            .iter()
            .map(|item| stock_key(&item.resource, item.variant_id.as_deref()))
            .collect::<Vec<_>>(),
    )?;
    let mut guarded = BTreeSet::new();
    let mut lines = Vec::with_capacity(items.len());
    let mut stock_intents = Vec::new();
    let mut catalog_guards = Vec::new();
    for item in items {
        let product = products
            .get(&item.resource)
            .ok_or_else(|| AppError::not_found("checkout product was not found"))?;
        if policy.is_physical() && !classifier.is_physical(&product.payload, &item.resource)? {
            return Err(crate::native_storefront_policy::restricted());
        }
        let catalog_version = super::fence::required_version(&product.version)?;
        if guarded.insert(item.resource.as_str()) {
            catalog_guards.push(CatalogGuard {
                resource: item.resource.clone(),
                version: catalog_version.clone(),
            });
        }
        let key = stock_key(&item.resource, item.variant_id.as_deref());
        let stock_exists = stocks.contains_key(&key);
        let mut catalog_payload = product.payload.clone();
        if stock_exists {
            clear_catalog_inventory(&mut catalog_payload, item.variant_id.as_deref());
        }
        let facts = crate::routes::products::catalog_item_facts(
            &catalog_payload,
            &item.resource,
            item.variant_id.as_deref(),
        )?;
        if stock_exists || facts.inventory_available.is_some() {
            stock_intents.push(StockIntent {
                resource: item.resource.clone(),
                variant_id: item.variant_id.clone(),
                quantity: item.qty,
                catalog_seed_on_hand: facts.inventory_available,
            });
        }
        lines.push(AuthoritativeQuoteLine {
            resource: item.resource.clone(),
            variant_id: item.variant_id.clone(),
            qty: item.qty,
            unit_amount_cents: facts.unit_amount_cents,
            line_total_cents: facts
                .unit_amount_cents
                .checked_mul(item.qty)
                .ok_or_else(|| AppError::unprocessable("quote line overflowed"))?,
            currency: facts.currency,
            title: facts.title,
            image: facts.image,
            payment_resource: facts.payment_resource,
            shipping_profile_id: facts.shipping_profile_id,
        });
    }
    catalog_guards.extend(
        classifier
            .profile_versions()
            .map(|(resource, version)| CatalogGuard { resource, version }),
    );
    Ok(ResolvedCatalog {
        lines,
        stock_intents,
        catalog_guards,
    })
}

fn clear_catalog_inventory(payload: &mut serde_json::Value, variant_id: Option<&str>) {
    if let Some(variant_id) = variant_id {
        if let Some(target) = payload
            .get_mut("variants")
            .and_then(serde_json::Value::as_array_mut)
            .and_then(|variants| {
                variants.iter_mut().find(|variant| {
                    variant.get("id").and_then(serde_json::Value::as_str) == Some(variant_id)
                })
            })
        {
            if let Some(object) = target.as_object_mut() {
                object.remove("inventoryQuantity");
                object.remove("inventoryStatus");
            }
        }
    }
    if let Some(object) = payload.as_object_mut() {
        object.remove("inventoryQuantity");
        object.remove("inventoryStatus");
    }
}

pub(super) fn one_currency(lines: &[AuthoritativeQuoteLine]) -> AppResult<String> {
    let Some(first) = lines.first() else {
        return Err(AppError::unprocessable("authoritative quote is empty"));
    };
    let currency = first.currency.clone();
    if lines.iter().any(|line| line.currency != currency) {
        return Err(AppError::unprocessable(
            "checkout items use mixed currencies",
        ));
    }
    Ok(currency)
}

pub(super) fn source_digest<T: serde::Serialize>(value: &T) -> AppResult<String> {
    let encoded = serde_json::to_vec(value).map_err(|error| {
        AppError::internal("cannot hash quote intent").with_internal(error.to_string())
    })?;
    Ok(hex::encode(Sha256::digest(encoded)))
}

fn cart_authority_unavailable() -> AppError {
    AppError::new(
        503,
        "cart_authority_unavailable",
        "verified cart authority is unavailable",
    )
}
