import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CedrosShopProvider } from '../config/context';
import { CartProvider, useCart } from '../state/cart/CartProvider';
import type { CommerceAdapter } from '../adapters/CommerceAdapter';
import type { CartSnapshot } from '../types';

function CartHarness() {
  const cart = useCart();
  return (
    <div>
      <div data-testid="count">{cart.count}</div>
      <div>{cart.items.map((i) => i.titleSnapshot).join(',')}</div>
    </div>
  );
}

describe('ecommerce CartProvider server merge', () => {
  beforeEach(() => {
    window.localStorage.removeItem('cedros_shop_cart_merge_test');
  });

  function createAdapter(
    mergeCart: NonNullable<CommerceAdapter['mergeCart']>
  ): CommerceAdapter {
    return {
      async listProducts() {
        return { items: [], page: 1, pageSize: 10 };
      },
      async getProductBySlug() {
        return null;
      },
      async listCategories() {
        return [];
      },
      async getOrderHistory() {
        return [];
      },
      async createCheckoutSession() {
        return { kind: 'custom', data: {} };
      },
      mergeCart,
    };
  }

  it('merges local cart with server cart when signed in', async () => {
    window.localStorage.setItem(
      'cedros_shop_cart_merge_test',
      JSON.stringify({
        items: [
          {
            productId: 'p_local',
            qty: 1,
            unitPrice: 10,
            currency: 'USD',
            titleSnapshot: 'Local',
          },
        ],
      })
    );

    const adapter = createAdapter(async ({ cart }) => {
        return {
          items: [
            ...cart.items,
            {
              productId: 'p_server',
              qty: 2,
              unitPrice: 5,
              currency: 'USD',
              titleSnapshot: 'Server',
            },
          ],
        };
      });

    render(
      <CedrosShopProvider
        config={{
          currency: 'USD',
          checkout: { mode: 'minimal', requireEmail: true },
          adapter,
          cart: { storageKey: 'cedros_shop_cart_merge_test' },
          customer: { id: 'user_1', isSignedIn: true },
        }}
      >
        <CartProvider>
          <CartHarness />
        </CartProvider>
      </CedrosShopProvider>
    );

    // Wait for merge effect
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('3');
    });
    expect(screen.getByText(/Local,Server/)).toBeTruthy();
  });

  it('retries merge when first attempt fails and dependencies change', async () => {
    window.localStorage.setItem(
      'cedros_shop_cart_merge_test',
      JSON.stringify({
        items: [
          {
            productId: 'p_local',
            qty: 1,
            unitPrice: 10,
            currency: 'USD',
            titleSnapshot: 'Local',
          },
        ],
      })
    );

    let attempt = 0;
    const mergeCart: NonNullable<CommerceAdapter['mergeCart']> = vi.fn(async ({ cart }) => {
      attempt += 1;
      if (attempt === 1) {
        throw new Error('temporary merge failure');
      }
      return {
        items: [
          ...cart.items,
          {
            productId: 'p_server',
            qty: 1,
            unitPrice: 5,
            currency: 'USD',
            titleSnapshot: 'Server',
          },
        ],
      };
    });

    const adapter1 = createAdapter(mergeCart);
    const { rerender } = render(
      <CedrosShopProvider
        config={{
          currency: 'USD',
          checkout: { mode: 'minimal', requireEmail: true },
          adapter: adapter1,
          cart: { storageKey: 'cedros_shop_cart_merge_test' },
          customer: { id: 'user_1', isSignedIn: true },
        }}
      >
        <CartProvider>
          <CartHarness />
        </CartProvider>
      </CedrosShopProvider>
    );

    await waitFor(() => {
      expect(mergeCart).toHaveBeenCalledTimes(1);
    });

    // Change adapter reference to trigger merge effect retry path
    rerender(
      <CedrosShopProvider
        config={{
          currency: 'USD',
          checkout: { mode: 'minimal', requireEmail: true },
          adapter: createAdapter(mergeCart),
          cart: { storageKey: 'cedros_shop_cart_merge_test' },
          customer: { id: 'user_1', isSignedIn: true },
        }}
      >
        <CartProvider>
          <CartHarness />
        </CartProvider>
      </CedrosShopProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('2');
    });
    expect(mergeCart).toHaveBeenCalledTimes(2);
  });

  it('re-runs merge when customer changes', async () => {
    const mergeCart: NonNullable<CommerceAdapter['mergeCart']> = vi.fn(
      async ({ customerId }: { customerId: string; cart: CartSnapshot }) => {
      return {
        items: [
          {
            productId: `server_${customerId}`,
            qty: 1,
            unitPrice: 5,
            currency: 'USD',
            titleSnapshot: `Server-${customerId}`,
          },
        ],
      };
    });

    const { rerender } = render(
      <CedrosShopProvider
        config={{
          currency: 'USD',
          checkout: { mode: 'minimal', requireEmail: true },
          adapter: createAdapter(mergeCart),
          cart: { storageKey: 'cedros_shop_cart_merge_test' },
          customer: { id: 'user_1', isSignedIn: true },
        }}
      >
        <CartProvider>
          <CartHarness />
        </CartProvider>
      </CedrosShopProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Server-user_1/)).toBeTruthy();
    });

    rerender(
      <CedrosShopProvider
        config={{
          currency: 'USD',
          checkout: { mode: 'minimal', requireEmail: true },
          adapter: createAdapter(mergeCart),
          cart: { storageKey: 'cedros_shop_cart_merge_test' },
          customer: { id: 'user_2', isSignedIn: true },
        }}
      >
        <CartProvider>
          <CartHarness />
        </CartProvider>
      </CedrosShopProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Server-user_2/)).toBeTruthy();
    });
    expect(mergeCart).toHaveBeenCalledTimes(2);
  });
});
