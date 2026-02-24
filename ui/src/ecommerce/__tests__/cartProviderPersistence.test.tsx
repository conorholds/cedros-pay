import React from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CedrosShopProvider } from '../config/context';
import { CartProvider, useCart } from '../state/cart/CartProvider';
import type { CommerceAdapter } from '../adapters/CommerceAdapter';

const adapter: CommerceAdapter = {
  async listProducts() {
    return { items: [], page: 1, pageSize: 10, total: 0, hasNextPage: false };
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
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <CedrosShopProvider
      config={{
        currency: 'USD',
        checkout: { mode: 'minimal', requireEmail: true },
        adapter,
        cart: { storageKey: 'cedros_shop_cart_test' },
      }}
    >
      <CartProvider>{children}</CartProvider>
    </CedrosShopProvider>
  );
}

function CartHarness() {
  const cart = useCart();
  return (
    <div>
      <div data-testid="count">{cart.count}</div>
      <button
        type="button"
        onClick={() =>
          cart.addItem(
            {
              productId: 'p1',
              unitPrice: 10,
              currency: 'USD',
              titleSnapshot: 'Product',
            },
            1
          )
        }
      >
        add
      </button>
    </div>
  );
}

describe('ecommerce CartProvider persistence', () => {
  beforeEach(() => {
    window.localStorage.removeItem('cedros_shop_cart_test');
  });

  it('persists cart to localStorage and hydrates on remount', async () => {
    const user = userEvent.setup();

    const view1 = render(
      <Wrapper>
        <CartHarness />
      </Wrapper>
    );

    expect(screen.getByTestId('count').textContent).toBe('0');
    await user.click(screen.getByText('add'));
    expect(screen.getByTestId('count').textContent).toBe('1');

    view1.unmount();

    render(
      <Wrapper>
        <CartHarness />
      </Wrapper>
    );

    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});
