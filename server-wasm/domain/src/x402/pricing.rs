//! Exact, float-free money math for x402 pricing.
//!
//! Money lives in **integer atomic units**; every operation is exact integer
//! arithmetic with `u128` intermediates and **explicit rounding** — never `f64`,
//! which cannot represent decimal fractions (0.1, 0.29, …) exactly and so drifts
//! by sub-unit amounts at boundaries. Full-precision multiply-then-divide uses
//! `u128` intermediates before checked conversion to atomic units.
//!
//! Invariants enforced by construction and tests:
//! - No `f64` anywhere on the value path.
//! - No silent overflow/wrap: every operation that can overflow returns
//!   [`PriceError`].
//! - Rounding never *undercharges*: lossy conversions and discounts round the
//!   amount the buyer pays **up** (or the discount **down**).

/// Rounding policy for the lossy paths (`muldiv`, sub-unit conversion).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Rounding {
    /// Round toward zero.
    Floor,
    /// Round away from zero.
    Ceil,
    /// Round to nearest; ties (exactly .5) round up (away from zero).
    HalfUp,
    /// Round to nearest; ties round to the even quotient — banker's rounding,
    /// the unbiased round-to-nearest preferred for financial figures.
    HalfEven,
}

/// A failure in exact money arithmetic. Never a panic, never a wrap.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PriceError {
    /// The result does not fit in `u64` (an SPL token amount).
    Overflow,
    /// Division by zero.
    DivByZero,
    /// Decimal exponent out of range (`10^exp` would exceed `u128`).
    InvalidDecimals,
    /// A percentage/basis-point input exceeded 100%.
    DiscountTooLarge,
}

/// `10^exp` as `u128`. `10^38 < u128::MAX < 10^39`, so `exp` is capped at 38.
fn pow10(exp: u8) -> Result<u128, PriceError> {
    if exp > 38 {
        return Err(PriceError::InvalidDecimals);
    }
    Ok(10u128.pow(exp as u32))
}

/// Apply the rounding policy to an exact integer division given its `quotient`
/// and `remainder` over `divisor` (`0 <= remainder < divisor`). The single source
/// of truth for every rounding decision in this module. `remainder * 2` and
/// `quotient + 1` cannot overflow `u128`: callers keep `divisor <= u64::MAX`
/// (muldiv) or `<= 10^38` (scale), and `quotient` is strictly less than
/// `u128::MAX`.
fn round_division(quotient: u128, remainder: u128, divisor: u128, rounding: Rounding) -> u128 {
    if remainder == 0 {
        return quotient;
    }
    let twice = remainder * 2;
    match rounding {
        Rounding::Floor => quotient,
        Rounding::Ceil => quotient + 1,
        Rounding::HalfUp if twice >= divisor => quotient + 1,
        Rounding::HalfUp => quotient,
        Rounding::HalfEven if twice > divisor => quotient + 1,
        Rounding::HalfEven if twice == divisor && quotient % 2 == 1 => quotient + 1,
        Rounding::HalfEven => quotient,
    }
}

/// `(a * b) / c` computed in `u128` with the chosen rounding. `a*b` of two
/// `u64`s always fits in `u128`, so the product is exact before dividing —
/// the full-precision multiply-then-divide that float and narrow integers lose.
pub fn muldiv(a: u64, b: u64, c: u64, rounding: Rounding) -> Result<u64, PriceError> {
    if c == 0 {
        return Err(PriceError::DivByZero);
    }
    let numerator = (a as u128) * (b as u128);
    let divisor = c as u128;
    let rounded = round_division(numerator / divisor, numerator % divisor, divisor, rounding);
    u64::try_from(rounded).map_err(|_| PriceError::Overflow)
}

/// Re-scale an integer amount between two base-10 decimal precisions, with
/// explicit rounding on precision loss. The general form of the per-token
/// conversions (`cents` are `decimals = 2`); equivalent to `hylo-fix`'s
/// `convert`, but with a runtime exponent (token decimals come from config, not
/// the type system) and an explicit rounding mode. Up-scaling is exact;
/// down-scaling rounds per `rounding`.
pub fn scale_decimals(
    value: u64,
    from_decimals: u8,
    to_decimals: u8,
    rounding: Rounding,
) -> Result<u64, PriceError> {
    use core::cmp::Ordering;
    let scaled: u128 = match to_decimals.cmp(&from_decimals) {
        Ordering::Equal => value as u128,
        Ordering::Greater => {
            let factor = pow10(to_decimals - from_decimals)?;
            (value as u128)
                .checked_mul(factor)
                .ok_or(PriceError::Overflow)?
        }
        Ordering::Less => {
            let divisor = pow10(from_decimals - to_decimals)?;
            let v = value as u128;
            round_division(v / divisor, v % divisor, divisor, rounding)
        }
    };
    u64::try_from(scaled).map_err(|_| PriceError::Overflow)
}

/// Convert a USD-pegged fiat price in **whole cents** to a USD-stablecoin token's
/// atomic units (USDC/USDT/PYUSD are 1:1 with USD).
///
/// Exact when `token_decimals >= 2` (`atomic = cents * 10^(decimals - 2)`, e.g.
/// 1299¢ → 12_990_000 USDC@6). For a token with fewer than 2 decimals (sub-cent
/// precision unrepresentable) the result is rounded **up** so the buyer never
/// underpays.
pub fn usd_cents_to_stablecoin_atomic(cents: u64, token_decimals: u8) -> Result<u64, PriceError> {
    scale_decimals(cents, 2, token_decimals, Rounding::Ceil)
}

/// Convert `amount` into another unit by an exact rate expressed as the ratio
/// `rate_numerator / rate_denominator`, using full-precision multiply-then-divide
/// (`hylo-fix` does this via `mul_div`). This is the primitive for pricing in a
/// **non-USD-pegged token** (e.g. SOL): the rate itself comes from a price
/// oracle/config, never from this module. Example: $10.00 (1000¢) at a rate of
/// 50_000 token-atomic per cent → `convert_with_rate(1000, 50_000, 1, …)`.
pub fn convert_with_rate(
    amount: u64,
    rate_numerator: u64,
    rate_denominator: u64,
    rounding: Rounding,
) -> Result<u64, PriceError> {
    muldiv(amount, rate_numerator, rate_denominator, rounding)
}

/// Render an atomic amount as a fixed-precision decimal string for display
/// (e.g. 12_990_000 @ 6 → "12.990000"). For presentation only; the wire
/// `maxAmountRequired` stays the raw atomic integer.
pub fn format_atomic_decimal(atomic: u64, decimals: u8) -> String {
    let width = decimals as usize;
    if width == 0 {
        return atomic.to_string();
    }
    let digits = atomic.to_string();
    if digits.len() <= width {
        format!("0.{digits:0>width$}")
    } else {
        let (integer, fraction) = digits.split_at(digits.len() - width);
        format!("{integer}.{fraction}")
    }
}

/// Whether `paid` covers `required` (overpayment allowed, underpayment not).
/// Exact integer comparison — with everything in atomic units there is no float
/// drift, so no tolerance is needed.
pub fn is_sufficient(paid_atomic: u64, required_atomic: u64) -> bool {
    paid_atomic >= required_atomic
}

/// Apply a basis-point discount (`1500` = 15.00% off). The **discount amount is
/// floored**, so the charged price rounds up — it never undercharges. Rejects
/// discounts over 100%.
pub fn apply_bps_discount(atomic: u64, discount_bps: u32) -> Result<u64, PriceError> {
    if discount_bps > 10_000 {
        return Err(PriceError::DiscountTooLarge);
    }
    let discount = muldiv(atomic, discount_bps as u64, 10_000, Rounding::Floor)?;
    // discount <= atomic because discount_bps <= 10_000.
    Ok(atomic - discount)
}

/// Apply a fixed discount in atomic units, clamping to zero.
pub fn apply_fixed_discount(atomic: u64, discount_atomic: u64) -> u64 {
    atomic.saturating_sub(discount_atomic)
}

/// Unit price × quantity, with overflow checking.
pub fn line_total(unit_atomic: u64, quantity: u64) -> Result<u64, PriceError> {
    unit_atomic
        .checked_mul(quantity)
        .ok_or(PriceError::Overflow)
}

/// Sum line totals with overflow checking.
pub fn sum_atomic(amounts: &[u64]) -> Result<u64, PriceError> {
    let mut total: u64 = 0;
    for &a in amounts {
        total = total.checked_add(a).ok_or(PriceError::Overflow)?;
    }
    Ok(total)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn muldiv_is_exact_and_full_precision() {
        // Exact division, no remainder.
        assert_eq!(muldiv(1_000, 3, 1, Rounding::Floor).unwrap(), 3_000);
        // Full-precision intermediate: u64::MAX * 2 / 2 == u64::MAX (would overflow u64).
        assert_eq!(muldiv(u64::MAX, 2, 2, Rounding::Floor).unwrap(), u64::MAX);
    }

    #[test]
    fn muldiv_rounding_modes() {
        // 10 / 3 = 3.333…
        assert_eq!(muldiv(10, 1, 3, Rounding::Floor).unwrap(), 3);
        assert_eq!(muldiv(10, 1, 3, Rounding::Ceil).unwrap(), 4);
        assert_eq!(muldiv(10, 1, 3, Rounding::HalfUp).unwrap(), 3);
        // 5 / 2 = 2.5 → tie rounds up under HalfUp.
        assert_eq!(muldiv(5, 1, 2, Rounding::HalfUp).unwrap(), 3);
        assert_eq!(muldiv(5, 1, 2, Rounding::Floor).unwrap(), 2);
        // 7 / 2 = 3.5 → tie rounds up.
        assert_eq!(muldiv(7, 1, 2, Rounding::HalfUp).unwrap(), 4);
    }

    #[test]
    fn muldiv_div_by_zero_and_overflow() {
        assert_eq!(muldiv(1, 1, 0, Rounding::Floor), Err(PriceError::DivByZero));
        // u64::MAX * u64::MAX / 1 does not fit u64.
        assert_eq!(
            muldiv(u64::MAX, u64::MAX, 1, Rounding::Floor),
            Err(PriceError::Overflow)
        );
    }

    #[test]
    fn cents_to_stablecoin_atomic_is_exact_for_usdc() {
        // $12.99 → 12_990_000 USDC atomic (6 decimals). The float path
        // (12.99 * 1e6) is 12989999.999… — this stays exact.
        assert_eq!(usd_cents_to_stablecoin_atomic(1299, 6).unwrap(), 12_990_000);
        // $10.50 → 10_500_000 (matches the verifier KAT fixture).
        assert_eq!(usd_cents_to_stablecoin_atomic(1050, 6).unwrap(), 10_500_000);
        // $0.01 → 10_000.
        assert_eq!(usd_cents_to_stablecoin_atomic(1, 6).unwrap(), 10_000);
        // $0.00 → 0.
        assert_eq!(usd_cents_to_stablecoin_atomic(0, 6).unwrap(), 0);
        // USD itself (2 decimals) → cents unchanged.
        assert_eq!(usd_cents_to_stablecoin_atomic(1299, 2).unwrap(), 1299);
        // 9-decimal token → cents * 10^7.
        assert_eq!(
            usd_cents_to_stablecoin_atomic(1299, 9).unwrap(),
            12_990_000_000
        );
    }

    #[test]
    fn cents_to_atomic_rounds_up_for_sub_cent_tokens() {
        // A 1-decimal token: $0.05 (5¢) → 5 / 10 = 0.5 → ceil → 1 atomic unit.
        assert_eq!(usd_cents_to_stablecoin_atomic(5, 1).unwrap(), 1);
        // $0.10 (10¢) → exactly 1 atomic unit at 1 decimal.
        assert_eq!(usd_cents_to_stablecoin_atomic(10, 1).unwrap(), 1);
        // 0-decimal token: $1.50 (150¢) → ceil(150/100) = 2 whole units.
        assert_eq!(usd_cents_to_stablecoin_atomic(150, 0).unwrap(), 2);
    }

    #[test]
    fn cents_to_atomic_overflow() {
        assert_eq!(
            usd_cents_to_stablecoin_atomic(u64::MAX, 18),
            Err(PriceError::Overflow)
        );
    }

    #[test]
    fn bps_discount_floors_the_discount_never_undercharging() {
        // 15% off $1299.00 worth of USDC atomic.
        let price = 12_990_000u64;
        assert_eq!(apply_bps_discount(price, 1_500).unwrap(), 11_041_500);
        // 10% off 10_000_000 → 9_000_000.
        assert_eq!(apply_bps_discount(10_000_000, 1_000).unwrap(), 9_000_000);
        // 0% off → unchanged.
        assert_eq!(apply_bps_discount(12_990_000, 0).unwrap(), 12_990_000);
        // 100% off → free.
        assert_eq!(apply_bps_discount(12_990_000, 10_000).unwrap(), 0);
        // > 100% rejected.
        assert_eq!(
            apply_bps_discount(100, 10_001),
            Err(PriceError::DiscountTooLarge)
        );
    }

    #[test]
    fn bps_discount_never_undercharges_on_odd_amounts() {
        // 33.33% off 100: exact discount = 333.3 → floored to 333 → charged 9667
        // (1 unit MORE than the .67% exact), never less.
        let charged = apply_bps_discount(10_000, 3_333).unwrap();
        let discount = 10_000 - charged;
        // floor(10000 * 3333 / 10000) = floor(3333.0) = 3333
        assert_eq!(discount, 3_333);
        assert_eq!(charged, 6_667);
        // Property: charged + discount == original, discount is the floored share.
        assert_eq!(charged + discount, 10_000);
    }

    #[test]
    fn fixed_discount_clamps_to_zero() {
        assert_eq!(apply_fixed_discount(10_000, 3_000), 7_000);
        assert_eq!(apply_fixed_discount(2_000, 5_000), 0);
        assert_eq!(apply_fixed_discount(0, 1), 0);
    }

    #[test]
    fn line_total_and_sum_check_overflow() {
        assert_eq!(line_total(12_990_000, 3).unwrap(), 38_970_000);
        assert_eq!(line_total(u64::MAX, 2), Err(PriceError::Overflow));
        assert_eq!(sum_atomic(&[1, 2, 3]).unwrap(), 6);
        assert_eq!(sum_atomic(&[u64::MAX, 1]), Err(PriceError::Overflow));
    }

    #[test]
    fn muldiv_half_even_is_unbiased() {
        // Ties round to the even neighbour (banker's rounding).
        assert_eq!(muldiv(1, 1, 2, Rounding::HalfEven).unwrap(), 0); // 0.5 → 0
        assert_eq!(muldiv(3, 1, 2, Rounding::HalfEven).unwrap(), 2); // 1.5 → 2
        assert_eq!(muldiv(5, 1, 2, Rounding::HalfEven).unwrap(), 2); // 2.5 → 2
        assert_eq!(muldiv(7, 1, 2, Rounding::HalfEven).unwrap(), 4); // 3.5 → 4
                                                                     // Non-ties still round to nearest.
        assert_eq!(muldiv(10, 1, 3, Rounding::HalfEven).unwrap(), 3); // 3.33 → 3
        assert_eq!(muldiv(11, 1, 3, Rounding::HalfEven).unwrap(), 4); // 3.67 → 4
                                                                      // Contrast: HalfUp biases every tie upward.
        assert_eq!(muldiv(1, 1, 2, Rounding::HalfUp).unwrap(), 1);
        assert_eq!(muldiv(5, 1, 2, Rounding::HalfUp).unwrap(), 3);
    }

    #[test]
    fn scale_decimals_invalid_decimals_is_rejected() {
        // A 39-place exponent shift exceeds 10^38 (the u128-representable range).
        assert_eq!(
            scale_decimals(1, 0, 39, Rounding::Floor),
            Err(PriceError::InvalidDecimals)
        );
        assert_eq!(
            scale_decimals(1, 39, 0, Rounding::Floor),
            Err(PriceError::InvalidDecimals)
        );
    }

    #[test]
    fn scale_decimals_up_is_exact_down_rounds() {
        // Up-scale (cents → 6-dec token): exact.
        assert_eq!(
            scale_decimals(1299, 2, 6, Rounding::Ceil).unwrap(),
            12_990_000
        );
        // Same scale: identity.
        assert_eq!(scale_decimals(42, 6, 6, Rounding::Floor).unwrap(), 42);
        // Down-scale 6 → 2 (token atomic → cents): 12_345_678 @6 = 12.345678.
        assert_eq!(
            scale_decimals(12_345_678, 6, 2, Rounding::Floor).unwrap(),
            1234
        );
        assert_eq!(
            scale_decimals(12_345_678, 6, 2, Rounding::Ceil).unwrap(),
            1235
        );
        assert_eq!(
            scale_decimals(12_345_678, 6, 2, Rounding::HalfUp).unwrap(),
            1235
        );
        assert_eq!(
            scale_decimals(12_344_000, 6, 2, Rounding::HalfUp).unwrap(),
            1234
        );
        // Overflow on extreme up-scale.
        assert_eq!(
            scale_decimals(u64::MAX, 0, 18, Rounding::Floor),
            Err(PriceError::Overflow)
        );
    }

    #[test]
    fn cents_helper_is_scale_decimals_specialised() {
        for cents in [0u64, 1, 99, 1299, 1_000_000] {
            assert_eq!(
                usd_cents_to_stablecoin_atomic(cents, 6).unwrap(),
                scale_decimals(cents, 2, 6, Rounding::Ceil).unwrap()
            );
        }
    }

    #[test]
    fn convert_with_rate_is_full_precision() {
        // 1000¢ at 50_000 token-atomic per cent → 50_000_000.
        assert_eq!(
            convert_with_rate(1000, 50_000, 1, Rounding::Floor).unwrap(),
            50_000_000
        );
        // Fractional rate via denominator, both rounding directions.
        assert_eq!(convert_with_rate(1000, 1, 3, Rounding::Floor).unwrap(), 333);
        assert_eq!(convert_with_rate(1000, 1, 3, Rounding::Ceil).unwrap(), 334);
        assert_eq!(
            convert_with_rate(1, 1, 0, Rounding::Floor),
            Err(PriceError::DivByZero)
        );
    }

    #[test]
    fn format_atomic_decimal_renders_fixed_precision() {
        assert_eq!(format_atomic_decimal(12_990_000, 6), "12.990000");
        assert_eq!(format_atomic_decimal(1, 6), "0.000001");
        assert_eq!(format_atomic_decimal(0, 6), "0.000000");
        assert_eq!(format_atomic_decimal(1_000_000, 6), "1.000000");
        assert_eq!(format_atomic_decimal(150, 0), "150");
        assert_eq!(format_atomic_decimal(1234, 2), "12.34");
        assert_eq!(format_atomic_decimal(5, 2), "0.05");
    }

    #[test]
    fn is_sufficient_allows_exact_and_over_not_under() {
        assert!(is_sufficient(12_990_000, 12_990_000));
        assert!(is_sufficient(12_990_001, 12_990_000));
        assert!(!is_sufficient(12_989_999, 12_990_000));
    }

    /// Exhaustive invariant sweep: discounts never undercharge and never exceed
    /// the original, across a grid of amounts and basis points.
    #[test]
    fn discount_invariants_hold_across_a_grid() {
        for &amount in &[0u64, 1, 99, 1299, 10_000, 12_990_000, 1_000_000_000] {
            for bps in (0u32..=10_000).step_by(137) {
                let charged = apply_bps_discount(amount, bps).unwrap();
                assert!(charged <= amount, "discount must not increase the price");
                // The exact (real-number) discounted price is amount*(1-bps/10000);
                // the floored-discount charge is always >= that exact price.
                // Verify: charged*10000 >= amount*(10000-bps)  (no undercharge).
                let lhs = charged as u128 * 10_000;
                let rhs = amount as u128 * (10_000 - bps) as u128;
                assert!(lhs >= rhs, "amount={amount} bps={bps} undercharged");
            }
        }
    }
}
