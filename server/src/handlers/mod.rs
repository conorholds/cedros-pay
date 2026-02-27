pub mod admin;
pub mod admin_ai;
pub mod admin_ai_assistant;
pub mod admin_chats;
pub mod admin_collections;
pub mod admin_config;
pub mod admin_coupons;
pub mod admin_coupons_stripe;
pub mod admin_customers;
pub mod admin_disputes;
pub mod admin_faqs;
pub mod admin_gift_cards;
pub mod admin_inventory;
pub mod admin_orders;
pub mod admin_products;
pub mod admin_products_stripe;
pub mod admin_products_types;
pub mod admin_refunds;
pub mod admin_returns;
pub mod admin_shipping;
pub mod admin_stripe_refunds;
pub mod admin_subscriptions;
pub mod admin_tax;
pub mod admin_variations;
pub mod admin_webhooks;
pub mod ai_discovery;
pub mod cart;
pub mod chat;
pub mod collections;
pub mod credits;
pub mod credits_holds;
pub mod discovery;
pub mod faqs;
pub mod gasless;
pub mod health;
pub mod metrics;
pub mod paywall;
pub mod products;
pub mod purchases;
pub mod refunds;
pub mod response;
pub mod rpc_proxy;
pub mod storefront;
pub mod stripe;
pub mod subscriptions;
pub mod verify;

pub use health::health;
pub use paywall::{quote, quote_402, AcceptEntry, AppState, QuoteQuery};
pub use response::{json_error, json_ok, json_ok_cached, json_response, to_json};
pub use rpc_proxy::{
    derive_token_account, get_blockhash, DeriveTokenAccountRequest, DeriveTokenAccountResponse,
    GetBlockhashResponse,
};

/// Validate metadata size limit (prevents DoS via oversized metadata)
pub fn validate_metadata_size(metadata: &serde_json::Value) -> Result<(), String> {
    let size = metadata.to_string().len();
    if size > crate::constants::MAX_METADATA_SIZE {
        return Err(format!(
            "metadata size {} exceeds limit of {} bytes",
            size,
            crate::constants::MAX_METADATA_SIZE
        ));
    }
    Ok(())
}

/// Validate metadata HashMap size limit
pub fn validate_metadata_map_size(
    metadata: &std::collections::HashMap<String, String>,
) -> Result<(), String> {
    let size: usize = metadata.iter().map(|(k, v)| k.len() + v.len()).sum();
    if size > crate::constants::MAX_METADATA_SIZE {
        return Err(format!(
            "metadata size {} exceeds limit of {} bytes",
            size,
            crate::constants::MAX_METADATA_SIZE
        ));
    }
    Ok(())
}

/// Maximum allowed limit for list endpoints.
pub(crate) const MAX_LIST_LIMIT: i32 = 1000;

/// Cap a pagination limit to [1, MAX_LIST_LIMIT].
pub(crate) fn cap_limit(limit: i32) -> i32 {
    limit.clamp(1, MAX_LIST_LIMIT)
}

/// Cap an optional pagination limit to [1, MAX_LIST_LIMIT], using `default` if None.
pub(crate) fn cap_limit_opt(limit: Option<i32>, default: i32) -> i32 {
    limit.unwrap_or(default).clamp(1, MAX_LIST_LIMIT)
}
