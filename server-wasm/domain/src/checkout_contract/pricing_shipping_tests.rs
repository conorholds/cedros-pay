use serde_json::json;

use super::api_request::{FulfillmentIntent, ShippingAddress, ShippingIntent};
use super::AuthoritativeQuoteLine;
use crate::fake::FakeSeams;

fn line(profile: Option<&str>) -> AuthoritativeQuoteLine {
    AuthoritativeQuoteLine {
        resource: "product-1".into(),
        variant_id: None,
        qty: 1,
        unit_amount_cents: 1_000,
        line_total_cents: 1_000,
        currency: "USD".into(),
        title: "Product".into(),
        image: None,
        payment_resource: "product-1".into(),
        shipping_profile_id: profile.map(str::to_string),
    }
}

fn fulfillment(country: &str) -> FulfillmentIntent {
    FulfillmentIntent::Shipping {
        address: ShippingAddress {
            line1: "1 Main".into(),
            line2: None,
            city: "Town".into(),
            region: Some("CA".into()),
            postal_code: "90210".into(),
            country: country.into(),
        },
        shipping: ShippingIntent {
            option_id: "ground".into(),
        },
    }
}

fn seed(seams: &FakeSeams, rate_type: &str, currency: &str) {
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "shipping_profile:domestic",
        json!({ "id": "domestic", "countries": ["US"], "active": true }),
    );
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "shipping_rate:ground",
        json!({
            "id": "ground", "profileId": "domestic", "rateType": rate_type,
            "amountCents": 599, "currency": currency, "minSubtotal": 500,
            "maxSubtotal": 2_000, "active": true
        }),
    );
}

#[test]
fn selects_active_flat_rate_for_profile_destination_currency_and_range() {
    let seams = FakeSeams::new();
    seed(&seams, "flat", "USD");
    let charge = super::pricing_shipping::resolve(
        &seams,
        &[line(Some("domestic"))],
        "USD",
        1_000,
        &fulfillment("us"),
    )
    .unwrap();
    assert_eq!(
        (charge.amount_cents, charge.rate_id.as_deref()),
        (599, Some("ground"))
    );
}

#[test]
fn rejects_unmodeled_basis_currency_range_and_ambiguous_profiles() {
    for (rate_type, currency, subtotal, code) in [
        ("weight", "USD", 1_000, "shipping_basis_unavailable"),
        ("flat", "EUR", 1_000, "shipping_authority_unavailable"),
        ("flat", "USD", 2_001, "unprocessable"),
    ] {
        let seams = FakeSeams::new();
        seed(&seams, rate_type, currency);
        let error = super::pricing_shipping::resolve(
            &seams,
            &[line(Some("domestic"))],
            "USD",
            subtotal,
            &fulfillment("US"),
        )
        .unwrap_err();
        assert_eq!(error.code, code);
    }
    let error = super::pricing_shipping::resolve(
        &FakeSeams::new(),
        &[line(Some("domestic")), line(Some("international"))],
        "USD",
        1_000,
        &fulfillment("US"),
    )
    .unwrap_err();
    assert_eq!(error.code, "shipping_profile_ambiguous");
}
