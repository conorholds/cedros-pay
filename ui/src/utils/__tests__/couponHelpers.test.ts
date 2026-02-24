import { stackCheckoutCoupons, type Coupon } from "../couponHelpers";

describe("stackCheckoutCoupons", () => {
  it("should return original price when no coupons provided", () => {
    expect(stackCheckoutCoupons(100, [])).toBe(100);
  });

  it("should apply single percentage discount correctly", () => {
    const coupons: Coupon[] = [
      { code: "SAVE10", discountType: "percentage", discountValue: 10 },
    ];
    expect(stackCheckoutCoupons(100, coupons)).toBe(90);
  });

  it("should apply single fixed discount correctly", () => {
    const coupons: Coupon[] = [
      { code: "FIXED5", discountType: "fixed", discountValue: 5 },
    ];
    expect(stackCheckoutCoupons(100, coupons)).toBe(95);
  });

  it("should apply percentage first, then fixed (user's bug scenario)", () => {
    // Cart: $1.20, Coupons: CRYPTO5AUTO (5%) + FIXED5 ($0.50)
    const coupons: Coupon[] = [
      { code: "CRYPTO5AUTO", discountType: "percentage", discountValue: 5 },
      { code: "FIXED5", discountType: "fixed", discountValue: 0.50 },
    ];

    const result = stackCheckoutCoupons(1.20, coupons);

    // Expected calculation:
    // 1. Apply 5%: $1.20 × 0.95 = $1.14
    // 2. Apply $0.50: $1.14 - $0.50 = $0.64
    expect(result).toBe(0.64);
  });

  it("should stack multiple percentage discounts multiplicatively", () => {
    const coupons: Coupon[] = [
      { code: "SAVE10", discountType: "percentage", discountValue: 10 },
      { code: "EXTRA20", discountType: "percentage", discountValue: 20 },
    ];

    // $100 × 0.9 × 0.8 = $72
    expect(stackCheckoutCoupons(100, coupons)).toBe(72);
  });

  it("should sum multiple fixed discounts additively", () => {
    const coupons: Coupon[] = [
      { code: "DOLLAR1", discountType: "fixed", discountValue: 1 },
      { code: "HALFOFF", discountType: "fixed", discountValue: 0.50 },
    ];

    // $100 - $1.50 = $98.50
    expect(stackCheckoutCoupons(100, coupons)).toBe(98.50);
  });

  it("should apply all percentage discounts before any fixed discounts", () => {
    const coupons: Coupon[] = [
      { code: "SAVE10", discountType: "percentage", discountValue: 10 },
      { code: "EXTRA20", discountType: "percentage", discountValue: 20 },
      { code: "DOLLAR1", discountType: "fixed", discountValue: 1 },
      { code: "HALFOFF", discountType: "fixed", discountValue: 0.50 },
    ];

    // Step 1: $100 × 0.9 = $90
    // Step 2: $90 × 0.8 = $72
    // Step 3: $72 - $1.50 = $70.50
    expect(stackCheckoutCoupons(100, coupons)).toBe(70.50);
  });

  it("should round up to nearest cent", () => {
    const coupons: Coupon[] = [
      { code: "SAVE33", discountType: "percentage", discountValue: 33 },
    ];

    // $1.00 × 0.67 = $0.67 (exact)
    // But with rounding: Math.ceil(0.67 * 100) / 100 = 0.67
    expect(stackCheckoutCoupons(1.00, coupons)).toBe(0.67);

    // Test case that requires rounding up
    // $1.01 × 0.67 = $0.6767 → rounds to $0.68
    expect(stackCheckoutCoupons(1.01, coupons)).toBe(0.68);
  });

  it("should prevent negative prices", () => {
    const coupons: Coupon[] = [
      { code: "FIXED100", discountType: "fixed", discountValue: 100 },
    ];

    expect(stackCheckoutCoupons(50, coupons)).toBe(0);
  });

  it("should handle the multi-item cart from user's example", () => {
    // User's cart:
    // - demo-item-id-3: 2 × $0.10 = $0.20
    // - demo-item-id-1: 1 × $1.00 = $1.00
    // Subtotal: $1.20

    const coupons: Coupon[] = [
      { code: "CRYPTO5AUTO", discountType: "percentage", discountValue: 5 },
      { code: "FIXED5", discountType: "fixed", discountValue: 0.50 },
    ];

    const subtotal = 1.20;
    const result = stackCheckoutCoupons(subtotal, coupons);

    // Backend shows: $0.64
    // Frontend was showing: $0.70 (bug - missing 5% discount)
    expect(result).toBe(0.64);
  });
});
