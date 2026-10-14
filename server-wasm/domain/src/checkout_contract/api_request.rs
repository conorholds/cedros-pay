use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CanonicalQuoteRequest {
    pub schema_version: u8,
    pub idempotency_key: String,
    pub attempt_id: String,
    pub client_material_sha256: String,
    pub source: QuoteSource,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub promotion_code: Option<String>,
    pub customer_context: CustomerContext,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tip: Option<TipIntent>,
    pub requested_payment_methods: Vec<PaymentMethod>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum QuoteSource {
    VersionedCart {
        lane: String,
        generation: String,
        version: u64,
    },
    Items {
        items: Vec<QuoteItemIntent>,
    },
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct QuoteItemIntent {
    pub resource: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub qty: u64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CustomerContext {
    pub fulfillment: FulfillmentIntent,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub contact: Option<ContactIntent>,
    pub return_urls: ReturnUrls,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum FulfillmentIntent {
    Digital {},
    Shipping {
        address: ShippingAddress,
        shipping: ShippingIntent,
    },
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ShippingAddress {
    pub line1: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub line2: Option<String>,
    pub city: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub region: Option<String>,
    pub postal_code: String,
    pub country: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ShippingIntent {
    pub option_id: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ContactIntent {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReturnUrls {
    pub success: String,
    pub cancel: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum TipIntent {
    Fixed { amount_cents: u64 },
    Percentage { basis_points: u32 },
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
/// Canonical payment rail selected from an authoritative quote.
pub enum PaymentMethod {
    Stripe,
    X402,
    Credits,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CanonicalCheckoutRequest {
    pub schema_version: u8,
    pub idempotency_key: String,
    pub attempt_id: String,
    pub client_material_sha256: String,
    pub quote_operation_id: String,
    pub payment_method: PaymentMethod,
    pub customer_context: CustomerContext,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rail_proof: Option<RailProof>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum RailProof {
    Stripe {},
    X402 { transaction: String },
    Credits {},
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CanonicalResolveRequest {
    pub schema_version: u8,
    pub operation_id: String,
    pub expected_attempt_id: String,
    pub return_artifact: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CanonicalVerifyRequest {
    pub schema_version: u8,
    pub expected_attempt_id: String,
    pub return_artifact: String,
}
