//! Amount comparison utilities for payment verification

use crate::constants::{AMOUNT_TOLERANCE, CART_AMOUNT_TOLERANCE};

/// Single product tolerance: allows overpayment
/// Per spec (19-services-paywall.md): paid >= required - tolerance
pub fn amount_sufficient(paid: f64, required: f64) -> bool {
    paid >= required - AMOUNT_TOLERANCE
}

// DEAD-001: Removed unused amount_matches (float version)
// Use amount_matches_atomic instead for precision

/// Cart tolerance using atomic units (integers) for precision.
/// Avoids floating-point precision issues by comparing in atomic units.
///
/// # Arguments
/// * `paid_atomic` - Paid amount in atomic units (e.g., lamports, smallest token unit)
/// * `required_major` - Required amount in major units (e.g., dollars, tokens)
/// * `decimals` - Number of decimal places for the token
///
/// # Returns
/// `true` if paid amount matches required within tolerance, `false` otherwise
pub fn amount_matches_atomic(paid_atomic: i64, required_major: f64, decimals: u8) -> bool {
    // Validate input is finite
    if !required_major.is_finite() {
        tracing::warn!(
            required_major = %required_major,
            "amount_matches_atomic received non-finite required_major"
        );
        return false;
    }

    // Protect against overflow for high decimal counts (max safe is 18 for i64)
    if decimals > 18 {
        tracing::warn!(
            decimals = decimals,
            "amount_matches_atomic received decimals > 18, using 18"
        );
    }
    let safe_decimals = decimals.min(18);

    // Convert required amount to atomic units with overflow protection
    let multiplier = 10_i64.pow(safe_decimals as u32);
    let raw_required = required_major * multiplier as f64;

    // Check for overflow before casting
    let required_atomic = if raw_required >= i64::MAX as f64 {
        tracing::warn!(
            required_major = %required_major,
            decimals = decimals,
            "amount_matches_atomic overflow, clamping to i64::MAX"
        );
        i64::MAX
    } else if raw_required <= i64::MIN as f64 {
        i64::MIN
    } else {
        raw_required.round() as i64
    };

    // Calculate tolerance in atomic units (CART_AMOUNT_TOLERANCE * 10^decimals)
    // Use ceiling to ensure we don't reject valid payments at boundaries
    let raw_tolerance = (CART_AMOUNT_TOLERANCE * multiplier as f64).ceil();
    let tolerance_atomic = if raw_tolerance >= i64::MAX as f64 || !raw_tolerance.is_finite() {
        i64::MAX
    } else {
        raw_tolerance as i64
    };
    // Ensure at least 1 atomic unit tolerance for rounding
    let tolerance_atomic = tolerance_atomic.max(1);

    // BUG-13: Use i128 to prevent overflow with saturating_sub().abs() near i64 boundaries
    let diff = i128::from(paid_atomic) - i128::from(required_atomic);
    diff.unsigned_abs() <= tolerance_atomic as u128
}

/// Cart tolerance with atomic units only (no float required amount).
pub fn amount_matches_atomic_units(paid_atomic: i64, required_atomic: i64, decimals: u8) -> bool {
    let tolerance_atomic = cart_tolerance_atomic(decimals);

    let diff = i128::from(paid_atomic) - i128::from(required_atomic);
    diff.unsigned_abs() <= tolerance_atomic as u128
}

/// Compute cart tolerance in atomic units using integer math.
///
/// `CART_AMOUNT_TOLERANCE` is 1e-6 in major units. So tolerance_atomic is
/// `10^decimals / 1_000_000`, with a floor of 1.
fn cart_tolerance_atomic(decimals: u8) -> i64 {
    // Clamp decimals to 18 to keep 10^decimals within i128.
    let safe_decimals = decimals.min(18);
    let ten_pow = 10_i128.pow(safe_decimals as u32);
    let tol = ten_pow / 1_000_000;
    let tol = tol.clamp(0, i64::MAX as i128) as i64;
    tol.max(1)
}

/// Refund tolerance: exact match required (within floating-point epsilon)
/// Per spec (19-services-paywall.md): paid == required
///
/// IMPORTANT: Never compare floats with `==` directly due to precision errors.
/// Uses epsilon comparison to handle floating-point representation issues.
/// For example: 0.1 + 0.2 != 0.3 in IEEE 754 floating point.
pub fn amount_exact(paid: f64, required: f64) -> bool {
    // Handle non-finite values explicitly
    if !paid.is_finite() || !required.is_finite() {
        return false;
    }

    // For exact match, use a very tight tolerance (1e-9)
    // This allows for floating-point representation errors while still
    // requiring effectively exact amounts for refunds
    const EXACT_TOLERANCE: f64 = 1e-9;
    (paid - required).abs() <= EXACT_TOLERANCE
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_amount_sufficient() {
        // Exact match
        assert!(amount_sufficient(10.0, 10.0));
        // Overpayment allowed
        assert!(amount_sufficient(10.5, 10.0));
        // Tiny underpayment within tolerance (1e-9)
        assert!(amount_sufficient(10.0 - AMOUNT_TOLERANCE / 2.0, 10.0));
        // Underpayment beyond tolerance not allowed
        assert!(!amount_sufficient(9.9, 10.0));
    }

    // DEAD-001: Removed test_amount_matches (was for removed function)

    #[test]
    fn test_amount_matches_atomic() {
        // USDC with 6 decimals: 10.5 USDC = 10_500_000 atomic units
        assert!(amount_matches_atomic(10_500_000, 10.5, 6));

        // Exact match
        assert!(amount_matches_atomic(10_000_000, 10.0, 6));

        // Within 1 atomic unit tolerance (always allowed)
        assert!(amount_matches_atomic(10_000_001, 10.0, 6));
        assert!(amount_matches_atomic(9_999_999, 10.0, 6));

        // Beyond tolerance for 6 decimals (tolerance = 1e-6 * 1e6 = 1)
        // 10 atomic units off should fail
        assert!(!amount_matches_atomic(10_000_010, 10.0, 6));
        assert!(!amount_matches_atomic(9_999_990, 10.0, 6));

        // SOL with 9 decimals: 1.0 SOL = 1_000_000_000 lamports
        // Tolerance = 1e-6 * 1e9 = 1000 lamports
        assert!(amount_matches_atomic(1_000_000_000, 1.0, 9));
        assert!(amount_matches_atomic(1_000_000_999, 1.0, 9)); // Within 1000 tolerance
        assert!(amount_matches_atomic(999_999_001, 1.0, 9)); // Within 1000 tolerance
        assert!(!amount_matches_atomic(1_000_002_000, 1.0, 9)); // Beyond tolerance
    }

    #[test]
    fn test_amount_matches_atomic_large_values() {
        // Test with values that would lose precision in f64 (> 2^53)
        // 10 million USDC = 10_000_000_000_000 atomic (6 decimals)
        // This is well within f64 precision range
        assert!(amount_matches_atomic(10_000_000_000_000, 10_000_000.0, 6));

        // Edge case: very small amounts
        assert!(amount_matches_atomic(1, 0.000001, 6));
        assert!(amount_matches_atomic(0, 0.0, 6));
    }

    #[test]
    fn test_amount_matches_atomic_units() {
        // USDC (6 decimals): tolerance is 1 atomic unit.
        assert!(amount_matches_atomic_units(10_000_001, 10_000_000, 6));
        assert!(amount_matches_atomic_units(9_999_999, 10_000_000, 6));
        assert!(!amount_matches_atomic_units(10_000_010, 10_000_000, 6));

        // SOL (9 decimals): tolerance is 1000 lamports.
        assert!(amount_matches_atomic_units(1_000_000_999, 1_000_000_000, 9));
        assert!(amount_matches_atomic_units(999_999_001, 1_000_000_000, 9));
        assert!(!amount_matches_atomic_units(
            1_000_002_000,
            1_000_000_000,
            9
        ));
    }

    #[test]
    fn test_amount_matches_atomic_high_decimals_no_overflow() {
        // R3-001: With decimals=18, multiplier = 10^18, tolerance multiplication
        // could overflow i64 without the guard. Verify it doesn't panic.
        // tolerance = 1e-6 * 1e18 = 1e12, which fits i64.
        assert!(amount_matches_atomic(1_000_000_000_000_000_000, 1.0, 18));
        // Even with extreme required_major, the tolerance guard prevents wrapping.
        assert!(!amount_matches_atomic(0, 1e18, 18));
    }

    #[test]
    fn test_amount_matches_atomic_extreme_i64_no_panic() {
        // BUG-13: saturating_sub(i64::MIN, positive).abs() would panic.
        // With i128 arithmetic this should not panic and should return false.
        assert!(!amount_matches_atomic(i64::MIN, 1.0, 6));
        assert!(!amount_matches_atomic(i64::MAX, -1.0, 0));
        // Both extremes
        assert!(!amount_matches_atomic(i64::MIN, 9_000_000_000_000.0, 6));
    }

    #[test]
    fn test_amount_exact() {
        // Exact match
        assert!(amount_exact(10.0, 10.0));
        // Not exact - 0.0001 difference is beyond 1e-9 tolerance
        assert!(!amount_exact(10.0001, 10.0));
        // Floating-point precision test: 0.1 + 0.2 should equal 0.3
        // This would fail with == comparison due to IEEE 754 representation
        assert!(amount_exact(0.1 + 0.2, 0.3));
        // Within epsilon tolerance
        assert!(amount_exact(10.0 + 1e-10, 10.0));
        // Beyond epsilon tolerance
        assert!(!amount_exact(10.0 + 1e-8, 10.0));
        // Non-finite values should return false
        assert!(!amount_exact(f64::NAN, 10.0));
        assert!(!amount_exact(10.0, f64::NAN));
        assert!(!amount_exact(f64::INFINITY, 10.0));
        assert!(!amount_exact(10.0, f64::NEG_INFINITY));
    }
}
