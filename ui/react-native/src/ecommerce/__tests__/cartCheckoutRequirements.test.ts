import { describe, expect, it } from 'vitest';
import { getCartCheckoutRequirements } from '../utils/cartCheckoutRequirements';
import type { CartItem } from '../types';

describe('getCartCheckoutRequirements', () => {
  it('treats missing shippingProfile as physical and requires shipping when enabled', () => {
    const items: CartItem[] = [
      {
        productId: 'p1',
        qty: 1,
        unitPrice: 10,
        currency: 'USD',
        titleSnapshot: 'Product',
      },
    ];

    const req = getCartCheckoutRequirements(items, {
      requireEmail: true,
      defaultMode: 'shipping',
      allowShipping: true,
    });

    expect(req.hasPhysical).toBe(true);
    expect(req.isDigitalOnly).toBe(false);
    expect(req.shippingAddress).toBe(true);
  });

  it('drops shipping collection for digital-only carts and carries fulfillment notes', () => {
    const items: CartItem[] = [
      {
        productId: 'p1',
        qty: 1,
        unitPrice: 10,
        currency: 'USD',
        titleSnapshot: 'Digital',
        metadata: {
          shippingProfile: 'digital',
          fulfillmentNotes: 'Download after purchase.',
        },
      },
    ];

    const req = getCartCheckoutRequirements(items, {
      requireEmail: false,
      defaultMode: 'shipping',
      allowShipping: true,
    });

    expect(req.isDigitalOnly).toBe(true);
    expect(req.shippingAddress).toBe(false);
    expect(req.fulfillmentNotes).toContain('Download after purchase.');
  });
});
