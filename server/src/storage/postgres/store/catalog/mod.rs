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
    adjust_gift_card_balance, create_collection, create_customer, create_dispute,
    create_gift_card, delete_collection, get_collection, get_customer, get_dispute,
    get_gift_card, list_collections, list_customers, list_disputes, list_gift_cards,
    try_adjust_gift_card_balance, update_collection, update_customer, update_dispute_status,
    update_gift_card,
};
