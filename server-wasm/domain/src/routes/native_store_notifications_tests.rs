//! Tests for Apple notification lifecycle reconciliation. The JWS verification is
//! proven in `native_store::apple`; here we prove the post-verify state mutations
//! (revoke on refund/expiry, extend on renewal, no-op otherwise).

use super::*;
use crate::fake::FakeSeams;
use crate::routes::native_store;
use serde_json::json;

fn seed_sub_with_provider(
    s: &FakeSeams,
    sub_id: &str,
    status: &str,
    customer: &str,
    price: &str,
    provider: &str,
) {
    seed_sub_with_provider_ref(s, sub_id, sub_id, status, customer, price, provider);
}

fn seed_sub_with_provider_ref(
    s: &FakeSeams,
    sub_id: &str,
    provider_ref: &str,
    status: &str,
    customer: &str,
    price: &str,
    provider: &str,
) {
    s.seed(
        ids::MODEL_SUBSCRIPTIONS,
        sub_id,
        json!({
            "subscriptionId": sub_id,
            "customerRef": customer,
            "priceId": price,
            "status": status,
            "provider": provider,
            "providerRef": provider_ref,
            "currentPeriodEnd": "2030-01-01T00:00:00Z",
            "cancelAtPeriodEnd": false,
            "createdAt": "2023-01-01T00:00:00Z",
            "updatedAt": "2023-01-01T00:00:00Z",
        }),
    );
}

fn seed_sub(s: &FakeSeams, sub_id: &str, status: &str, customer: &str, price: &str) {
    seed_sub_with_provider(s, sub_id, status, customer, price, APPLE_PROVIDER);
}

fn seed_ledger_with_provider(
    s: &FakeSeams,
    reference: &str,
    gross: i64,
    customer: &str,
    product: &str,
    provider: &str,
) {
    s.seed(
        ids::MODEL_LEDGER,
        reference,
        json!({
            "reference": reference,
            "kind": "payment",
            "status": "succeeded",
            "grossCents": gross,
            "refundCents": 0,
            "currency": "usd",
            "customerProfileId": customer,
            "productId": product,
            "provider": provider,
            "providerRef": reference,
            "createdAt": "2023-01-01T00:00:00Z",
            "processedAt": "2023-01-01T00:00:00Z",
        }),
    );
}

fn seed_ledger(s: &FakeSeams, reference: &str, gross: i64, customer: &str, product: &str) {
    seed_ledger_with_provider(s, reference, gross, customer, product, APPLE_PROVIDER);
}

fn notif_tx(txid: &str, orig: Option<&str>, expires: Option<i64>) -> NotifTx {
    NotifTx {
        transaction_id: Some(txid.into()),
        original_transaction_id: orig.map(Into::into),
        expires_date: expires,
        bundle_id: Some("com.acme.app".into()),
        environment: Some("Production".into()),
    }
}

fn configure_apple(s: &FakeSeams, allow_sandbox: bool) {
    s.set_setting("native_store.enabled", "true");
    s.set_setting("native_store.apple_enabled", "true");
    s.set_setting("native_store.apple_issuer_id", "issuer-1");
    s.set_setting("native_store.apple_key_id", "KEYID00001");
    s.set_setting("native_store.apple_bundle_id", "com.acme.app");
    s.set_setting(
        "native_store.apple_allow_sandbox_fallback",
        if allow_sandbox { "true" } else { "false" },
    );
    s.set_secret("native_store.apple_private_key", "unused-by-validation");
}

#[path = "native_store_notifications_apple_flow_tests.rs"]
mod flows;
