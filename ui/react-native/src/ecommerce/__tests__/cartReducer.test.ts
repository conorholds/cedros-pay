import { describe, expect, it } from 'vitest';
import { cartReducer, initialCartState } from '../state/cart/cartReducer';

describe('ecommerce cartReducer', () => {
  it('adds items and aggregates quantity', () => {
    const state1 = cartReducer(initialCartState, {
      type: 'cart/add',
      item: {
        productId: 'p1',
        unitPrice: 10,
        currency: 'USD',
        titleSnapshot: 'Product',
      },
      qty: 2,
    });

    expect(state1.items).toHaveLength(1);
    expect(state1.items[0]?.qty).toBe(2);

    const state2 = cartReducer(state1, {
      type: 'cart/add',
      item: {
        productId: 'p1',
        unitPrice: 10,
        currency: 'USD',
        titleSnapshot: 'Product',
      },
      qty: 1,
    });

    expect(state2.items).toHaveLength(1);
    expect(state2.items[0]?.qty).toBe(3);
  });

  it('removes when qty is set to 0', () => {
    const state1 = cartReducer(initialCartState, {
      type: 'cart/add',
      item: {
        productId: 'p1',
        unitPrice: 10,
        currency: 'USD',
        titleSnapshot: 'Product',
      },
      qty: 1,
    });

    const state2 = cartReducer(state1, { type: 'cart/setQty', productId: 'p1', variantId: undefined, qty: 0 });
    expect(state2.items).toHaveLength(0);
  });
});
