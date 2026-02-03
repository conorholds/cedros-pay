pub mod admin;
pub mod admin_ai;
pub mod admin_ai_assistant;
pub mod admin_chats;
pub mod admin_collections;
pub mod admin_config;
pub mod admin_customers;
pub mod admin_disputes;
pub mod admin_faqs;
pub mod admin_gift_cards;
pub mod admin_inventory;
pub mod admin_orders;
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
