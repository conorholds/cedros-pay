import type { SettlementResponse } from "../types";

/**
 * Parse coupon codes from metadata
 *
 * Parses comma-separated coupon codes from the coupon_codes field
 *
 * @param metadata - Metadata object from settlement response or cart callback
 * @returns Array of coupon codes that were applied
 *
 * @example
 * // Multiple coupons
 * parseCouponCodes({ coupon_codes: "SITE10,CRYPTO5AUTO,SAVE20" })
 * // Returns: ["SITE10", "CRYPTO5AUTO", "SAVE20"]
 *
 * @example
 * // Single coupon
 * parseCouponCodes({ coupon_codes: "SAVE20" })
 * // Returns: ["SAVE20"]
 *
 * @example
 * // No coupons applied
 * parseCouponCodes({})
 * // Returns: []
 */
export function parseCouponCodes(
  metadata?: Record<string, string | undefined> | SettlementResponse["metadata"]
): string[] {
  if (!metadata || !metadata.coupon_codes) {
    return [];
  }

  return metadata.coupon_codes
    .split(",")
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

/**
 * Format coupon codes for display
 *
 * @param coupons - Array of coupon codes
 * @param separator - Separator string (default: ", ")
 * @returns Formatted string
 *
 * @example
 * formatCouponCodes(["SITE10", "CRYPTO5AUTO", "SAVE20"])
 * // Returns: "SITE10, CRYPTO5AUTO, SAVE20"
 */
export function formatCouponCodes(
  coupons: string[],
  separator: string = ", "
): string {
  return coupons.join(separator);
}

/**
 * Calculate total discount percentage
 *
 * @param originalAmount - Original price before discounts
 * @param discountedAmount - Final price after discounts
 * @returns Discount percentage (0-100)
 *
 * @example
 * calculateDiscountPercentage(100, 75)
 * // Returns: 25.0
 */
export function calculateDiscountPercentage(
  originalAmount: number,
  discountedAmount: number
): number {
  if (originalAmount <= 0) return 0;
  const discount = originalAmount - discountedAmount;
  return (discount / originalAmount) * 100;
}

/**
 * Coupon interface matching backend types
 */
export interface Coupon {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  currency?: string;
  description?: string;
}

/**
 * Apply stacked coupons to a price using the same logic as the backend.
 *
 * CRITICAL: This must match the backend's StackCouponsOnMoney() behavior exactly:
 * 1. Apply all percentage discounts first (multiplicatively)
 * 2. Sum all fixed discounts and apply at the end
 * 3. Round to cents (2 decimal places) at the end
 *
 * @param subtotal - Original cart subtotal before checkout coupons
 * @param checkoutCoupons - Array of checkout-level coupons from /products endpoint
 * @returns Final price after all discounts applied, rounded to cents
 *
 * @example
 * // Cart: $1.20, Coupons: [5% off, $0.50 off]
 * stackCheckoutCoupons(1.20, [
 *   { code: "CRYPTO5AUTO", discountType: "percentage", discountValue: 5 },
 *   { code: "FIXED5", discountType: "fixed", discountValue: 0.50 }
 * ])
 * // Step 1: Apply 5%: $1.20 × 0.95 = $1.14
 * // Step 2: Apply $0.50: $1.14 - $0.50 = $0.64
 * // Returns: 0.64
 *
 * @example
 * // Multiple percentage discounts (stacked multiplicatively)
 * stackCheckoutCoupons(100, [
 *   { code: "SAVE10", discountType: "percentage", discountValue: 10 },
 *   { code: "EXTRA20", discountType: "percentage", discountValue: 20 },
 *   { code: "DOLLAR1", discountType: "fixed", discountValue: 1 },
 *   { code: "HALFOFF", discountType: "fixed", discountValue: 0.50 }
 * ])
 * // Step 1: $100 × 0.9 = $90
 * // Step 2: $90 × 0.8 = $72
 * // Step 3: $72 - $1.50 = $70.50
 * // Returns: 70.50
 */
export function stackCheckoutCoupons(
  subtotal: number,
  checkoutCoupons: Coupon[]
): number {
  if (!checkoutCoupons || checkoutCoupons.length === 0) {
    return subtotal;
  }

  let price = subtotal;
  let totalFixedDiscount = 0;

  // Phase 1: Apply all percentage discounts multiplicatively
  for (const coupon of checkoutCoupons) {
    if (coupon.discountType === "percentage") {
      const discountMultiplier = 1 - coupon.discountValue / 100;
      price = price * discountMultiplier;
    } else if (coupon.discountType === "fixed") {
      // Accumulate fixed discounts for phase 2
      totalFixedDiscount += coupon.discountValue;
    }
  }

  // Phase 2: Apply accumulated fixed discounts
  price = price - totalFixedDiscount;

  // Prevent negative prices
  if (price < 0) {
    price = 0;
  }

  // Round to cents (2 decimal places) - matches backend Money.RoundUpToCents()
  return Math.ceil(price * 100) / 100;
}
