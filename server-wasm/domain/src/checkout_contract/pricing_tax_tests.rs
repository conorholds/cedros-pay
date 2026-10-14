use serde_json::json;

use super::api_request::{FulfillmentIntent, ShippingAddress, ShippingIntent};
use crate::fake::FakeSeams;

fn fulfillment(region: Option<&str>) -> FulfillmentIntent {
    FulfillmentIntent::Shipping {
        address: ShippingAddress {
            line1: "1 Main".into(),
            line2: None,
            city: "Town".into(),
            region: region.map(str::to_string),
            postal_code: "90210".into(),
            country: "US".into(),
        },
        shipping: ShippingIntent {
            option_id: "ground".into(),
        },
    }
}

fn seed_rate(seams: &FakeSeams, key: &str, id: &str, region: Option<&str>, bps: i32) {
    seams.seed(
        crate::ids::MODEL_CATALOG,
        key,
        json!({
            "kind": "taxRate", "id": id, "country": "US", "region": region,
            "rateBps": bps, "active": true
        }),
    );
}

#[test]
fn exact_region_precedes_country_fallback_and_uses_half_up_base() {
    let seams = FakeSeams::new();
    seed_rate(&seams, "tax_rate:us", "us", None, 500);
    seed_rate(&seams, "tax_rate:ca", "ca", Some("CA"), 725);
    let exact = super::pricing_tax::resolve(&seams, 1_001, 99, &fulfillment(Some("ca"))).unwrap();
    assert_eq!(
        (exact.amount_cents, exact.rate_id.as_deref()),
        (80, Some("ca"))
    );
    let fallback =
        super::pricing_tax::resolve(&seams, 1_001, 99, &fulfillment(Some("NY"))).unwrap();
    assert_eq!(
        (fallback.amount_cents, fallback.rate_id.as_deref()),
        (55, Some("us"))
    );
    assert_eq!(super::pricing_tax::half_up_bps(1, 5_000).unwrap(), 1);
}

#[test]
fn duplicate_rates_at_selected_specificity_fail_closed() {
    let seams = FakeSeams::new();
    seed_rate(&seams, "tax_rate:ca-a", "ca-a", Some("CA"), 700);
    seed_rate(&seams, "tax_rate:ca-b", "ca-b", Some("CA"), 725);
    let error =
        super::pricing_tax::resolve(&seams, 1_000, 0, &fulfillment(Some("CA"))).unwrap_err();
    assert_eq!((error.status, error.code), (409, "tax_rate_ambiguous"));
}
