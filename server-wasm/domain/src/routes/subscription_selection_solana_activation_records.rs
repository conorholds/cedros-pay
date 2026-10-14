//! Durable records written by a verified initial Solana collection.

use serde_json::{json, Value};

use super::solana_activation_store::ActivationInput;
use crate::ids;
use crate::time;

pub(super) fn payment(input: &ActivationInput<'_>, fingerprint: &str) -> Value {
    json!({
        "reference": input.payment_signature,
        "kind": "payment",
        "status": "succeeded",
        "grossCents": input.plan.price_cents,
        "refundCents": 0,
        "currency": input.plan.currency,
        "customerProfileId": input.user_id,
        "routePath": "/paywall/v1/subscription/solana-subscription/activate",
        "productId": input.plan.id,
        "provider": "solana_subscription",
        "providerRef": input.payment_signature,
        "createdAt": time::iso8601(input.payment.block_time),
        "processedAt": time::iso8601(input.payment.block_time),
        "amountAtomic": input.solana.amount_atomic,
        "tokenMint": input.solana.token_mint,
        "recipientTokenAccount": input.receiver_token_account,
        "activationFingerprint": fingerprint,
    })
}

pub(super) fn subscription(input: &ActivationInput<'_>, id: &str, fingerprint: &str) -> Value {
    let start = time::iso8601(input.payment.period_start);
    let end = time::iso8601(input.payment.period_end);
    json!({
        "id": id,
        "subscriptionId": id,
        "customerRef": input.user_id,
        "userId": input.user_id,
        "cedrosLoginUserId": input.user_id,
        "wallet": input.wallet,
        "productId": input.plan.id,
        "planId": input.plan.id,
        "priceId": input.plan.id,
        "status": "active",
        "provider": "solana_subscription",
        "providerRef": input.addresses.subscription_address,
        "paymentMethod": "solana_subscription",
        "paymentSignature": input.payment_signature,
        "authorizationSignature": input.authorization_signature,
        "billingPeriod": if input.plan.interval == "yearly" { "year" } else { "month" },
        "billingInterval": 1,
        "currentPeriodStart": start,
        "currentPeriodEnd": end,
        "cancelAtPeriodEnd": false,
        "createdAt": time::iso8601(input.payment.block_time),
        "updatedAt": time::iso8601(input.payment.block_time),
        "metadata": input.metadata.cloned().unwrap_or_default(),
        "activationFingerprint": fingerprint,
        "solana": solana_state(input),
    })
}

pub(super) fn lifecycle(input: &ActivationInput<'_>, fingerprint: &str) -> Value {
    json!({
        "eventId": format!("solana-subscription-started:{}", short_hash(input.payment_signature)),
        "processedAt": time::iso8601(input.payment.block_time),
        "fingerprint": fingerprint,
        "eventType": ids::EVENT_SUBSCRIPTION_STARTED,
    })
}

fn solana_state(input: &ActivationInput<'_>) -> Value {
    json!({
        "programAddress": input.program_address,
        "merchantAddress": input.solana.merchant_address,
        "solanaPlanId": input.solana.plan_id,
        "planAddress": input.addresses.plan_address,
        "subscriptionAddress": input.addresses.subscription_address,
        "subscriptionAuthorityAddress": input.addresses.subscription_authority_address,
        "eventAuthorityAddress": input.addresses.event_authority_address,
        "subscriberTokenAccount": input.subscriber_token_account,
        "tokenMint": input.solana.token_mint,
        "tokenProgramAddress": input.token_program_address,
        "receiverTokenAccount": input.receiver_token_account,
        "collectorAddress": input.collector_address,
        "amountAtomic": input.solana.amount_atomic,
        "periodHours": input.solana.period_hours,
        "numberOfPayments": input.number_of_payments,
        "paymentsCollected": 1,
        "authorizationSignature": input.authorization_signature,
        "initialPaymentSignature": input.payment_signature,
        "lastCollectionSignature": input.payment_signature,
        "nextCollectionAt": time::iso8601(input.payment.period_end),
        "lastCollectionAt": time::iso8601(input.payment.block_time),
        "status": "active",
    })
}

fn short_hash(value: &str) -> String {
    use sha2::{Digest, Sha256};

    hex::encode(&Sha256::digest(value.as_bytes())[..16])
}
