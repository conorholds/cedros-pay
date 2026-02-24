import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CedrosShopProvider } from '../config/context';
import { CartProvider, useCart } from '../state/cart/CartProvider';
import { CheckoutProvider } from '../state/checkout/useCheckout';
import type { CheckoutSessionPayload, CommerceAdapter } from '../adapters/CommerceAdapter';
import { PaymentStep } from '../components/checkout/PaymentStep';

function SeedCart() {
  const cart = useCart();
  React.useEffect(() => {
    cart.addItem(
      {
        productId: 'p1',
        unitPrice: 10,
        currency: 'USD',
        titleSnapshot: 'Product',
        paymentResource: 'p1',
      },
      1
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe('ecommerce PaymentStep payment methods', () => {
  it('passes paymentMethodId from selection into adapter payload', async () => {
    (window as unknown as Record<string, unknown>).solana = {};

    const user = userEvent.setup();

    const createCheckoutSession = vi.fn(async (_payload: CheckoutSessionPayload) => {
      return { kind: 'custom', data: {} } as const;
    });

    const adapter: CommerceAdapter = {
      async listProducts() {
        return { items: [], page: 1, pageSize: 10, total: 0, hasNextPage: false };
      },
      async getProductBySlug(slug) {
        // Return product for inventory verification to pass
        if (slug === 'p1') {
          return {
            id: 'p1',
            slug: 'p1',
            title: 'Product',
            description: 'Test product',
            price: 10,
            currency: 'USD',
            images: [],
            tags: [],
            categoryIds: [],
            inventoryStatus: 'in_stock',
            inventoryQuantity: 100,
          };
        }
        return null;
      },
      async listCategories() {
        return [];
      },
      async getOrderHistory() {
        return [];
      },
      createCheckoutSession,
    };

    render(
      <CedrosShopProvider
        config={{
          currency: 'USD',
          checkout: {
            mode: 'none',
            requireEmail: false,
            paymentMethods: [
              { id: 'card', label: 'Card', ctaLabel: 'Pay now' },
              { id: 'crypto', label: 'Crypto', ctaLabel: 'Pay with wallet' },
            ],
          },
          adapter,
        }}
      >
        <CartProvider>
          <CheckoutProvider>
            <SeedCart />
            <PaymentStep />
          </CheckoutProvider>
        </CartProvider>
      </CedrosShopProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pay now' })).not.toBeDisabled();
    });

    await user.click(await screen.findByRole('tab', { name: 'Crypto' }));
    await user.click(screen.getByRole('button', { name: 'Pay with wallet' }));

    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
    const payload = createCheckoutSession.mock.calls[0]![0];
    expect(payload.options.paymentMethodId).toBe('crypto');

    delete (window as unknown as Record<string, unknown>).solana;
  });
});
