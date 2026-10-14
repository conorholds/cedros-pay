use super::api_request::TipIntent;
use super::pricing_tip::CheckoutTippingPolicy;
use crate::fake::FakeSeams;

fn policy(seams: &FakeSeams) {
    super::pricing_tip::store(
        seams,
        &CheckoutTippingPolicy {
            schema_version: 1,
            enabled: true,
            allow_fixed: true,
            allow_percentage: true,
            max_amount_cents: 500,
            max_percentage_bps: 2_000,
        },
    )
    .unwrap();
}

#[test]
fn missing_policy_fails_closed_and_configured_modes_are_checked() {
    let seams = FakeSeams::new();
    let missing =
        super::pricing_tip::resolve(&seams, 1_000, Some(&TipIntent::Fixed { amount_cents: 100 }))
            .unwrap_err();
    assert_eq!(
        (missing.status, missing.code),
        (503, "tipping_policy_unavailable")
    );
    policy(&seams);
    let fixed =
        super::pricing_tip::resolve(&seams, 1_000, Some(&TipIntent::Fixed { amount_cents: 100 }))
            .unwrap();
    assert_eq!(fixed.amount_cents, 100);
    let percentage = super::pricing_tip::resolve(
        &seams,
        1_001,
        Some(&TipIntent::Percentage {
            basis_points: 1_500,
        }),
    )
    .unwrap();
    assert_eq!(percentage.amount_cents, 150);
}

#[test]
fn tip_policy_limits_and_disablement_are_enforced() {
    let seams = FakeSeams::new();
    policy(&seams);
    for tip in [
        TipIntent::Fixed { amount_cents: 501 },
        TipIntent::Percentage {
            basis_points: 2_001,
        },
    ] {
        assert_eq!(
            super::pricing_tip::resolve(&seams, 1_000, Some(&tip))
                .unwrap_err()
                .status,
            422
        );
    }
    seams.set_setting(
        super::pricing_tip::POLICY_SETTING,
        r#"{"schemaVersion":1,"enabled":false,"allowFixed":true,"allowPercentage":true,"maxAmountCents":500,"maxPercentageBps":2000}"#,
    );
    assert_eq!(
        super::pricing_tip::resolve(&seams, 1_000, Some(&TipIntent::Fixed { amount_cents: 100 }))
            .unwrap_err()
            .status,
        422
    );
}
