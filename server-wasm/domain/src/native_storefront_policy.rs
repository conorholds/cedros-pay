//! Durable native storefront policy, read only from Data's host-authenticated service.
//! Request flags and local settings never relax the installed site's restrictions.
use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::Value;

use crate::{
    checkout_contract::{
        AuthoritativeQuoteLine, AuthoritativeQuoteSnapshot, CustomerContext, PaymentMethod,
    },
    db::Db,
    error::{AppError, AppResult},
    guarded_batch::GuardedCondition,
    ids,
    seams::{HostSeams, ServiceRequest},
};

pub const CAPABILITY: &str = "cedros-data:native-storefront-policy-read-v1";
pub const ROUTE: &str = "native-storefront-policy-read";

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Physical,
    Unrestricted,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct WirePolicy {
    contract_version: u8,
    mode: Mode,
    selected_contribution_ids: Vec<String>,
}

#[derive(Clone, Copy, Debug)]
pub struct Policy {
    mode: Mode,
}

impl Policy {
    pub fn load<S: HostSeams>(seams: &S) -> AppResult<Self> {
        let response = seams
            .service_invoke(&ServiceRequest {
                target_extension_id: "cedros-data".into(),
                route_id: ROUTE.into(),
                capability_id: CAPABILITY.into(),
                method: "POST".into(),
                path: "/native-storefront-policy/v1/read".into(),
                query: vec![],
                body_json: "{}".into(),
            })
            .map_err(|_| unavailable())?;
        if response.status != 200 || response.body.len() > 16 * 1024 {
            return Err(unavailable());
        }
        let wire: WirePolicy = serde_json::from_str(&response.body).map_err(|_| unavailable())?;
        let valid_ids = match wire.mode {
            Mode::Physical => wire.selected_contribution_ids == physical_contributions(),
            Mode::Unrestricted => wire.selected_contribution_ids.is_empty(),
        };
        if wire.contract_version != 1 || !valid_ids {
            return Err(unavailable());
        }
        Ok(Self { mode: wire.mode })
    }

    pub fn is_physical(self) -> bool {
        self.mode == Mode::Physical
    }

    pub fn require_context(
        self,
        methods: &[PaymentMethod],
        context: &CustomerContext,
    ) -> AppResult<()> {
        if self.is_physical()
            && (methods != [PaymentMethod::Stripe]
                || !matches!(
                    context.fulfillment,
                    crate::checkout_contract::FulfillmentIntent::Shipping { .. }
                ))
        {
            return Err(restricted());
        }
        Ok(())
    }

    fn require_lines<S: HostSeams>(
        self,
        seams: &S,
        items: &[AuthoritativeQuoteLine],
    ) -> AppResult<Vec<GuardedCondition>> {
        if !self.is_physical() {
            return Ok(Vec::new());
        }
        if items.is_empty() || items.len() > 100 {
            return Err(restricted());
        }
        let db = Db::new(seams, ids::DB_ACCESS);
        let records = db.read_keys(
            ids::MODEL_CATALOG,
            &items.iter().map(|i| i.resource.clone()).collect::<Vec<_>>(),
        )?;
        let mut classifier = Classifier::new(seams);
        let mut versions = BTreeMap::new();
        for item in items {
            let record = records.get(&item.resource).ok_or_else(restricted)?;
            if !crate::routes::products::is_public_product(&record.payload)
                || !classifier.is_physical(&record.payload, &item.resource)?
            {
                return Err(restricted());
            }
            versions.insert(
                item.resource.clone(),
                record
                    .version
                    .clone()
                    .filter(|version| !version.is_empty())
                    .ok_or_else(restricted)?,
            );
            let current = crate::routes::products::catalog_item_authority_facts(
                &record.payload,
                &item.resource,
                item.variant_id.as_deref(),
            )
            .map_err(|_| restricted())?;
            if current.shipping_profile_id != item.shipping_profile_id
                || current.payment_resource != item.payment_resource
            {
                return Err(restricted());
            }
        }
        versions.extend(classifier.profile_versions());
        Ok(versions
            .into_iter()
            .map(|(entry_key, expected_version)| GuardedCondition::Version {
                content_model_id: ids::MODEL_CATALOG,
                entry_key,
                expected_version,
            })
            .collect())
    }

    pub fn require_snapshot<S: HostSeams>(
        self,
        seams: &S,
        snapshot: &AuthoritativeQuoteSnapshot,
    ) -> AppResult<()> {
        self.snapshot_guards(seams, snapshot).map(drop)
    }

    /// Capture the exact authoritative revisions that must still hold when a
    /// checkout is claimed and immediately before provider work is licensed.
    pub fn snapshot_guards<S: HostSeams>(
        self,
        seams: &S,
        snapshot: &AuthoritativeQuoteSnapshot,
    ) -> AppResult<Vec<GuardedCondition>> {
        if !self.is_physical() {
            return Ok(Vec::new());
        }
        if snapshot.requested_payment_methods != [PaymentMethod::Stripe]
            || snapshot.x402.is_some()
            || snapshot.shipping_rate_id.is_none()
            || snapshot.lines.iter().any(|line| {
                line.payment_resource != line.resource || line.shipping_profile_id.is_none()
            })
            || crate::routes::products::physical_pricing::require_fiat_price(
                &serde_json::json!({"currency":snapshot.currency}),
            )
            .is_err()
            || snapshot
                .order_context
                .as_ref()
                .is_none_or(|context| context.digital)
        {
            return Err(restricted());
        }
        self.require_lines(seams, &snapshot.lines)
    }
}

/// Only canonical saved product/variant declarations and actual active profile
/// records establish classification. Stored/client `commerceKind` is ignored.
pub struct Classifier<'a, S: HostSeams> {
    db: Db<'a, S>,
    profiles: BTreeMap<String, Option<String>>,
}

impl<'a, S: HostSeams> Classifier<'a, S> {
    pub fn new(seams: &'a S) -> Self {
        Self {
            db: Db::new(seams, ids::DB_ACCESS),
            profiles: BTreeMap::new(),
        }
    }

    pub fn is_physical(&mut self, product: &Value, resource: &str) -> AppResult<bool> {
        if product["productType"] != "standard"
            || product.pointer("/fulfillment/type").and_then(Value::as_str) != Some("physical")
            || crate::routes::products::is_capacity_product(product)
            || crate::routes::products::is_capacity_handle(resource)
        {
            return Ok(false);
        }
        // Settlement grants paymentResource entitlements. A physical facade must
        // never alias a different (potentially digital) product or retain an
        // ambiguous linked, recurring or token price authority.
        let mut priced = product.clone();
        if !remove_self_alias(&mut priced, resource) {
            return Ok(false);
        }
        if let Some(variants) = priced.get_mut("variants").and_then(Value::as_array_mut) {
            for variant in variants {
                if !remove_self_alias(variant, resource) {
                    return Ok(false);
                }
            }
        }
        if crate::routes::products::physical_pricing::require_product_price(&priced).is_err() {
            return Ok(false);
        }
        let Some(profile) = product["shippingProfileId"].as_str() else {
            return Ok(false);
        };
        if !profile_matches(product, profile) || !self.active_profile(profile)? {
            return Ok(false);
        }
        if let Some(variants) = product.get("variants") {
            let Some(variants) = variants.as_array() else {
                return Ok(false);
            };
            if variants.len() > 100 {
                return Ok(false);
            }
            for variant in variants {
                if variant
                    .get("productType")
                    .is_some_and(|kind| kind != "standard")
                    || variant
                        .pointer("/fulfillment/type")
                        .is_some_and(|kind| kind != "physical")
                {
                    return Ok(false);
                }
                let variant_profile = variant
                    .get("shippingProfileId")
                    .map(Value::as_str)
                    .unwrap_or(Some(profile));
                let Some(variant_profile) = variant_profile else {
                    return Ok(false);
                };
                if !profile_matches(variant, variant_profile)
                    || !self.active_profile(variant_profile)?
                {
                    return Ok(false);
                }
            }
        }
        Ok(true)
    }

    pub fn profile_versions(&self) -> impl Iterator<Item = (String, String)> + '_ {
        self.profiles.iter().filter_map(|(id, version)| {
            version
                .as_ref()
                .map(|version| (format!("shipping_profile:{id}"), version.clone()))
        })
    }

    fn active_profile(&mut self, id: &str) -> AppResult<bool> {
        if id.is_empty()
            || id.len() > 120
            || !id
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b))
        {
            return Ok(false);
        }
        if let Some(version) = self.profiles.get(id) {
            return Ok(version.is_some());
        }
        let version = self
            .db
            .read_one(ids::MODEL_CATALOG, &format!("shipping_profile:{id}"))?
            .filter(|record| {
                record.payload["kind"] == "shippingProfile"
                    && record.payload["id"] == id
                    && record.payload["active"] == true
            })
            .and_then(|record| record.version.filter(|version| !version.is_empty()));
        let active = version.is_some();
        self.profiles.insert(id.into(), version);
        Ok(active)
    }
}

fn remove_self_alias(value: &mut Value, resource: &str) -> bool {
    let Some(object) = value.as_object_mut() else {
        return false;
    };
    let safe = object.get("paymentResource").is_none_or(|value| {
        value.is_null()
            || value
                .as_str()
                .is_some_and(|value| value.is_empty() || value == resource)
    });
    if safe {
        object.remove("paymentResource");
    }
    safe
}

fn profile_matches(product: &Value, id: &str) -> bool {
    product
        .pointer("/fulfillment/shippingProfileId")
        .is_none_or(|value| value.as_str() == Some(id))
}

pub fn physical_contributions() -> Vec<String> {
    let mut ids = [
        "shop",
        "category",
        "product",
        "cart",
        "checkout",
        "account",
        "purchase-history",
    ]
    .iter()
    .flat_map(|surface| {
        ["page", "page-template", "surface"]
            .iter()
            .map(move |kind| format!("cedros-shop:{surface}-{kind}"))
    })
    .collect::<Vec<_>>();
    ids.sort();
    ids
}

fn unavailable() -> AppError {
    AppError::new(
        503,
        "native_storefront_policy_unavailable",
        "authoritative native storefront policy is unavailable",
    )
}

pub fn restricted() -> AppError {
    AppError::new(
        403,
        "native_storefront_physical_only",
        "this storefront supports verified physical goods with shipping and card checkout only",
    )
}

#[cfg(test)]
#[path = "native_storefront_policy_tests.rs"]
mod tests;

/// Legacy initiators cannot prove canonical physical/shipping authority. Keep
/// historical reads, cancellations, refunds and provider settlement callbacks
/// available; new storefront purchases use canonical Stripe checkout.
pub fn require_request<S: HostSeams>(
    seams: &S,
    request: &crate::reqresp::RouteRequest,
) -> AppResult<()> {
    // Some legacy handlers dispatch by transport path. A host/service caller
    // cannot use a read route ID with a purchase path to evade this boundary.
    let purchase = restricted_route(&request.route_id) || purchase_transport(request);
    if purchase && Policy::load(seams)?.is_physical() {
        return Err(restricted());
    }
    Ok(())
}

/// Handler transport inventory, deliberately independent of public discovery:
/// retired compatibility paths can still be selected inside grouped handlers.
fn purchase_transport(request: &crate::reqresp::RouteRequest) -> bool {
    use crate::routes;
    [
        routes::paywall::ROUTES,
        routes::stripe_session::ROUTES,
        routes::subscription_session::ROUTES,
        routes::subscription_selection::ROUTES,
        routes::subscriptions::ROUTES,
        routes::x402::ROUTES,
        routes::cart::ROUTES,
        routes::cart_checkout::ROUTES,
        routes::cart_credits::ROUTES,
        routes::native_store::ROUTES,
        routes::assistant_x402::ROUTES,
        routes::access_pass::ROUTES,
    ]
    .into_iter()
    .flatten()
    .any(|route| {
        restricted_route(route.route_id) && routes::matches(request, route.method, route.path)
    }) || [routes::credits::AUTHORIZE_PATH, routes::credits::HOLD_PATH]
        .iter()
        .any(|path| routes::matches(request, "POST", path))
}

pub(crate) fn restricted_route(route_id: &str) -> bool {
    matches!(
        route_id,
        ids::ROUTE_PAYWALL
            | ids::ROUTE_STRIPE_SESSION
            | ids::ROUTE_SUBSCRIPTION_STRIPE_SESSION
            | ids::ROUTE_SUBSCRIPTION_PLANS
            | ids::ROUTE_SUBSCRIPTION_FREE_SELECTION
            | ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION
            | ids::ROUTE_SUBSCRIPTION_PLAN_SOLANA_SUBSCRIPTION
            | ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_COLLECT_INITIAL
            | ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_ACTIVATE
            | ids::ROUTE_SUBSCRIPTIONS_CREATE
            | ids::ROUTE_SUBSCRIPTIONS_PORTAL
            | ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL
            | ids::ROUTE_QUOTE
            | ids::ROUTE_VERIFY
            | ids::ROUTE_CART_QUOTE
            | ids::ROUTE_CART_CHECKOUT
            | ids::ROUTE_CART_CREDITS_AUTHORIZE
            | ids::ROUTE_CREDITS_AUTHORIZE
            | ids::ROUTE_CREDITS_HOLD
            | ids::ROUTE_NATIVE_STORE_VERIFY
            | ids::ROUTE_ASSISTANT_X402_PURCHASE
            | ids::ROUTE_ACCESS_PASS_OFFER_RESOLVE
            | ids::ROUTE_ACCESS_PASS_PURCHASE
    )
}
