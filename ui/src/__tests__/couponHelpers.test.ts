import { parseCouponCodes, formatCouponCodes, calculateDiscountPercentage } from '../utils/couponHelpers';

describe('Coupon Helpers', () => {
  describe('parseCouponCodes', () => {
    it('should parse comma-separated coupon codes', () => {
      const metadata = { coupon_codes: 'SITE10,CRYPTO5AUTO,SAVE20' };
      const result = parseCouponCodes(metadata);
      expect(result).toEqual(['SITE10', 'CRYPTO5AUTO', 'SAVE20']);
    });

    it('should handle single coupon code', () => {
      const metadata = { coupon_codes: 'SAVE20' };
      const result = parseCouponCodes(metadata);
      expect(result).toEqual(['SAVE20']);
    });

    it('should handle empty coupon_codes string', () => {
      const metadata = { coupon_codes: '' };
      const result = parseCouponCodes(metadata);
      expect(result).toEqual([]);
    });

    it('should trim whitespace from coupon codes', () => {
      const metadata = { coupon_codes: ' SITE10 , CRYPTO5AUTO , SAVE20 ' };
      const result = parseCouponCodes(metadata);
      expect(result).toEqual(['SITE10', 'CRYPTO5AUTO', 'SAVE20']);
    });

    it('should filter out empty strings after split', () => {
      const metadata = { coupon_codes: 'SITE10,,SAVE20,' };
      const result = parseCouponCodes(metadata);
      expect(result).toEqual(['SITE10', 'SAVE20']);
    });

    it('should return empty array when no metadata provided', () => {
      const result = parseCouponCodes(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array when coupon_codes not present', () => {
      const metadata = { other_field: 'value' };
      const result = parseCouponCodes(metadata);
      expect(result).toEqual([]);
    });

    it('should handle SettlementResponse metadata format', () => {
      const settlement = {
        success: true,
        error: null,
        txHash: '5XYZ...',
        networkId: 'mainnet-beta',
        metadata: {
          coupon_codes: 'SITE10,CRYPTO5AUTO,SAVE20',
          original_amount: '1.000000',
          discounted_amount: '0.684000'
        }
      };
      const result = parseCouponCodes(settlement.metadata);
      expect(result).toEqual(['SITE10', 'CRYPTO5AUTO', 'SAVE20']);
    });
  });

  describe('formatCouponCodes', () => {
    it('should format array of coupons with default separator', () => {
      const coupons = ['SITE10', 'CRYPTO5AUTO', 'SAVE20'];
      const result = formatCouponCodes(coupons);
      expect(result).toBe('SITE10, CRYPTO5AUTO, SAVE20');
    });

    it('should format array with custom separator', () => {
      const coupons = ['SITE10', 'CRYPTO5AUTO', 'SAVE20'];
      const result = formatCouponCodes(coupons, ' + ');
      expect(result).toBe('SITE10 + CRYPTO5AUTO + SAVE20');
    });

    it('should handle single coupon', () => {
      const coupons = ['SAVE20'];
      const result = formatCouponCodes(coupons);
      expect(result).toBe('SAVE20');
    });

    it('should handle empty array', () => {
      const coupons: string[] = [];
      const result = formatCouponCodes(coupons);
      expect(result).toBe('');
    });
  });

  describe('calculateDiscountPercentage', () => {
    it('should calculate discount percentage correctly', () => {
      const result = calculateDiscountPercentage(100, 75);
      expect(result).toBe(25);
    });

    it('should handle percentage discounts', () => {
      // $100 with 10% + 5% off = $85.50
      const result = calculateDiscountPercentage(100, 85.5);
      expect(result).toBeCloseTo(14.5, 1);
    });

    it('should handle stacked discounts', () => {
      // $100 with 10% + 5% + $10 off = $75.50
      const result = calculateDiscountPercentage(100, 75.5);
      expect(result).toBeCloseTo(24.5, 1);
    });

    it('should handle no discount', () => {
      const result = calculateDiscountPercentage(100, 100);
      expect(result).toBe(0);
    });

    it('should handle zero original amount', () => {
      const result = calculateDiscountPercentage(0, 0);
      expect(result).toBe(0);
    });

    it('should handle negative original amount', () => {
      const result = calculateDiscountPercentage(-100, 0);
      expect(result).toBe(0);
    });

    it('should handle decimal amounts', () => {
      // $1.00 to $0.684 (31.6% off)
      const result = calculateDiscountPercentage(1.0, 0.684);
      expect(result).toBeCloseTo(31.6, 1);
    });

    it('should return percentage within 0-100 range', () => {
      const result = calculateDiscountPercentage(100, 50);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('Integration: Parse and Calculate', () => {
    it('should work together for real settlement response', () => {
      const settlementMetadata = {
        coupon_codes: 'SITE10,CRYPTO5AUTO,SAVE20',
        original_amount: '1.000000',
        discounted_amount: '0.684000'
      };

      const coupons = parseCouponCodes(settlementMetadata);
      expect(coupons).toHaveLength(3);

      const formatted = formatCouponCodes(coupons);
      expect(formatted).toBe('SITE10, CRYPTO5AUTO, SAVE20');

      const original = parseFloat(settlementMetadata.original_amount);
      const final = parseFloat(settlementMetadata.discounted_amount);
      const discount = calculateDiscountPercentage(original, final);
      expect(discount).toBeCloseTo(31.6, 1);
    });

    it('should handle single coupon in integration', () => {
      const settlementMetadata = {
        coupon_codes: 'SAVE20',
        original_amount: '100.000000',
        discounted_amount: '80.000000'
      };

      const coupons = parseCouponCodes(settlementMetadata);
      expect(coupons).toEqual(['SAVE20']);

      const discount = calculateDiscountPercentage(100, 80);
      expect(discount).toBe(20);
    });
  });
});
