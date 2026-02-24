import { isCartCheckout, normalizeCartItems, getCartItemCount } from '../utils/cartHelpers';

describe('Cart Helpers', () => {
  describe('normalizeCartItems', () => {
    it('should preserve valid positive quantities', () => {
      const items = [
        { resource: 'item-1', quantity: 2 },
        { resource: 'item-2', quantity: 5 },
      ];
      const result = normalizeCartItems(items);
      expect(result).toEqual([
        { resource: 'item-1', quantity: 2, metadata: undefined },
        { resource: 'item-2', quantity: 5, metadata: undefined },
      ]);
    });

    it('should default missing quantities to 1', () => {
      const items = [
        { resource: 'item-1' },
        { resource: 'item-2', quantity: 3 },
      ];
      const result = normalizeCartItems(items);
      expect(result).toEqual([
        { resource: 'item-1', quantity: 1, metadata: undefined },
        { resource: 'item-2', quantity: 3, metadata: undefined },
      ]);
    });

    it('should coerce negative quantities to 1', () => {
      const items = [
        { resource: 'item-1', quantity: -3 },
        { resource: 'item-2', quantity: -1 },
      ];
      const result = normalizeCartItems(items);
      expect(result).toEqual([
        { resource: 'item-1', quantity: 1, metadata: undefined },
        { resource: 'item-2', quantity: 1, metadata: undefined },
      ]);
    });

    it('should coerce zero quantities to 1', () => {
      const items = [{ resource: 'item-1', quantity: 0 }];
      const result = normalizeCartItems(items);
      expect(result).toEqual([
        { resource: 'item-1', quantity: 1, metadata: undefined },
      ]);
    });

    it('should floor fractional quantities', () => {
      const items = [
        { resource: 'item-1', quantity: 2.7 },
        { resource: 'item-2', quantity: 3.2 },
        { resource: 'item-3', quantity: 0.9 }, // 0.9 floors to 0, then coerced to 1
      ];
      const result = normalizeCartItems(items);
      expect(result).toEqual([
        { resource: 'item-1', quantity: 2, metadata: undefined },
        { resource: 'item-2', quantity: 3, metadata: undefined },
        { resource: 'item-3', quantity: 1, metadata: undefined }, // floored to 0, then coerced to 1
      ]);
    });

    it('should handle NaN and invalid values', () => {
      const items = [
        { resource: 'item-1', quantity: NaN },
        { resource: 'item-2', quantity: Infinity },
        { resource: 'item-3', quantity: -Infinity },
      ];
      const result = normalizeCartItems(items);
      expect(result).toEqual([
        { resource: 'item-1', quantity: 1, metadata: undefined },
        { resource: 'item-2', quantity: 1, metadata: undefined },
        { resource: 'item-3', quantity: 1, metadata: undefined },
      ]);
    });

    it('should preserve metadata', () => {
      const items: Array<{ resource: string; quantity?: number; metadata?: Record<string, string> }> = [
        { resource: 'item-1', quantity: 2, metadata: { sku: 'ABC123' } },
        { resource: 'item-2', metadata: { color: 'red' } },
      ];
      const result = normalizeCartItems(items);
      expect(result).toEqual([
        { resource: 'item-1', quantity: 2, metadata: { sku: 'ABC123' } },
        { resource: 'item-2', quantity: 1, metadata: { color: 'red' } },
      ]);
    });
  });

  describe('getCartItemCount', () => {
    it('should sum valid quantities', () => {
      const items = [
        { quantity: 2 },
        { quantity: 3 },
        { quantity: 5 },
      ];
      expect(getCartItemCount(items)).toBe(10);
    });

    it('should default missing quantities to 1', () => {
      const items = [
        { quantity: 2 },
        {}, // defaults to 1
        { quantity: 3 },
      ];
      expect(getCartItemCount(items)).toBe(6);
    });

    it('should coerce negative quantities to 1', () => {
      const items = [
        { quantity: -3 },
        { quantity: 2 },
      ];
      expect(getCartItemCount(items)).toBe(3); // 1 + 2
    });

    it('should coerce zero quantities to 1', () => {
      const items = [
        { quantity: 0 },
        { quantity: 0 },
      ];
      expect(getCartItemCount(items)).toBe(2); // both become 1
    });

    it('should floor fractional quantities', () => {
      const items = [
        { quantity: 2.7 }, // becomes 2
        { quantity: 3.2 }, // becomes 3
        { quantity: 0.5 }, // floors to 0, then coerced to 1
      ];
      expect(getCartItemCount(items)).toBe(6); // 2 + 3 + 1
    });

    it('should handle empty array', () => {
      expect(getCartItemCount([])).toBe(0);
    });

    it('should handle invalid values', () => {
      const items = [
        { quantity: NaN },
        { quantity: Infinity },
        { quantity: -Infinity },
      ];
      expect(getCartItemCount(items)).toBe(3); // all become 1
    });
  });

  describe('isCartCheckout', () => {
    it('should return true for multiple items', () => {
      const items = [
        { resource: 'item-1', quantity: 1 },
        { resource: 'item-2', quantity: 1 }
      ];
      expect(isCartCheckout(items)).toBe(true);
    });

    it('should return true for single item with quantity > 1', () => {
      const items = [{ resource: 'item-1', quantity: 2 }];
      expect(isCartCheckout(items)).toBe(true);
    });

    it('should return true for single item with quantity = 3', () => {
      const items = [{ resource: 'item-1', quantity: 3 }];
      expect(isCartCheckout(items)).toBe(true);
    });

    it('should return false for single item with quantity = 1', () => {
      const items = [{ resource: 'item-1', quantity: 1 }];
      expect(isCartCheckout(items)).toBe(false);
    });

    it('should return false for single item without quantity (defaults to 1)', () => {
      const items = [{}];
      expect(isCartCheckout(items)).toBe(false);
    });

    it('should return false for empty array', () => {
      const items: Array<{ quantity?: number }> = [];
      expect(isCartCheckout(items)).toBe(false);
    });

    it('should return false for undefined items', () => {
      expect(isCartCheckout(undefined)).toBe(false);
    });

    it('should handle multiple items with mixed quantities', () => {
      const items = [
        { resource: 'item-1', quantity: 1 },
        { resource: 'item-2', quantity: 3 }
      ];
      expect(isCartCheckout(items)).toBe(true);
    });

    it('should handle multiple items without explicit quantities', () => {
      const items = [{}, {}];
      expect(isCartCheckout(items)).toBe(true);
    });

    it('should return false for single item with quantity = 0', () => {
      const items = [{ resource: 'item-1', quantity: 0 }];
      expect(isCartCheckout(items)).toBe(false);
    });

    it('should handle edge case: 3+ items', () => {
      const items = [
        { resource: 'item-1', quantity: 1 },
        { resource: 'item-2', quantity: 1 },
        { resource: 'item-3', quantity: 1 }
      ];
      expect(isCartCheckout(items)).toBe(true);
    });
  });
});
