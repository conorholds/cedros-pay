import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CedrosShopProvider } from '../config/context';
import { CartProvider, useCart } from '../state/cart/CartProvider';
import type { CommerceAdapter } from '../adapters/CommerceAdapter';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

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

// Mock React Native components for web testing environment
const MockView = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
  <div {...props}>{children}</div>
);
const MockTouchableOpacity = ({ children, onPress, ...props }: React.PropsWithChildren<Record<string, unknown> & { onPress?: () => void }>) => (
  <button onClick={onPress} {...props}>{children}</button>
);

function CartHarness() {
  const cart = useCart();
  return (
    <MockView>
      <MockView data-testid="count">{cart.count}</MockView>
      <MockTouchableOpacity
        type="button"
        onPress={() =>
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
      </MockTouchableOpacity>
    </MockView>
  );
}

describe('ecommerce CartProvider persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AsyncStorage.getItem as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (AsyncStorage.setItem as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it('persists cart to AsyncStorage and hydrates on remount', async () => {
    const user = userEvent.setup();

    // First render - no saved cart
    const view1 = render(
      <Wrapper>
        <CartHarness />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('0');
    });

    await user.click(screen.getByText('add'));

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });

    // Verify AsyncStorage.setItem was called with cart data
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    view1.unmount();

    // Mock the stored cart for second render
    const storedCart = {
      items: [
        {
          productId: 'p1',
          qty: 1,
          unitPrice: 10,
          currency: 'USD',
          titleSnapshot: 'Product',
        },
      ],
      promoCode: undefined,
    };
    (AsyncStorage.getItem as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify(storedCart)
    );

    // Second render - should hydrate from AsyncStorage
    render(
      <Wrapper>
        <CartHarness />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });
  });
});
