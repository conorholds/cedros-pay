use super::*;

pub(super) fn operation_context(kind: OperationKind) -> CanonicalOperationContext {
    match kind {
        OperationKind::Checkout => CanonicalOperationContext::Checkout {
            quote_operation_id: "payop_test-quote".into(),
            quote_scope: "scope".into(),
            subject_ref: None,
            payment_method: PaymentMethod::Stripe,
            stripe_request: Some(StripeRequestBinding {
                idempotency_key: format!("cedros-pay-checkout-{}", "1".repeat(64)),
                expires_at: 4_600,
            }),
            inventory_reservation: None,
        },
        OperationKind::Quote => CanonicalOperationContext::Quote {
            snapshot: Box::new(AuthoritativeQuoteSnapshot {
                schema_version: 1,
                order_context: None,
                source: SafeSourceBinding::Items {
                    intent_sha256: "test".into(),
                },
                lines: vec![],
                currency: "USD".into(),
                subtotal_cents: 0,
                discount_cents: 0,
                shipping_cents: 0,
                tax_cents: 0,
                tip_cents: 0,
                total_cents: 0,
                shipping_rate_id: None,
                tax_rate_id: None,
                applied_tip: None,
                inventory_hold: None,
                promotion_code: None,
                requested_payment_methods: vec![PaymentMethod::Stripe],
                x402: None,
                expires_at: "2026-05-31T12:15:00Z".into(),
            }),
            customer_context_hashes: CustomerContextHashes::default(),
            inventory_reservation: None,
            regional_policy: None,
        },
    }
}
