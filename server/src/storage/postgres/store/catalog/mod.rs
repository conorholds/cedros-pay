//! Catalog storage: shipping, tax, customers, disputes, gift cards, collections

use super::*;

mod entities;
mod shipping;

// ─── Re-exports (shipping) ───────────────────────────────────────────────────
pub(super) use shipping::{
    create_shipping_profile, create_shipping_rate, create_tax_rate, delete_shipping_profile,
    delete_shipping_rate, delete_tax_rate, get_shipping_profile, get_tax_rate,
    list_shipping_profiles, list_shipping_rates, list_tax_rates, update_shipping_profile,
    update_shipping_rate, update_tax_rate,
};

// ─── Re-exports (entities) ───────────────────────────────────────────────────
pub(super) use entities::{
    adjust_gift_card_balance, claim_gift_card_redemption, create_collection, create_customer,
    create_dispute, create_gift_card, delete_collection, get_asset_redemption, get_collection,
    get_customer, get_dispute, get_gift_card, get_gift_card_redemption_by_token,
    get_tenant_token22_mint, get_token22_mint_for_collection, list_asset_redemptions,
    list_collections, list_customers, list_disputes, list_gift_card_redemptions, list_gift_cards,
    record_asset_redemption, record_gift_card_redemption, record_token_burn_signature,
    try_adjust_gift_card_balance, update_asset_redemption_form_data,
    update_asset_redemption_status, update_collection,
    update_customer, update_dispute_status, update_gift_card, upsert_tenant_token22_mint,
    upsert_token22_mint_for_collection,
};
