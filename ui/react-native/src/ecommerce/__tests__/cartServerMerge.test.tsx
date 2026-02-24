import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

// Mock React Native components for web testing environment
const MockView = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
  <div {...props}>{children}</div>
);

function CartHarness() {
  const cart = useCart();
  return (
    <MockView>
      <MockView data-testid="count">{cart.count}</MockView>
      <MockView>{cart.items.map((i) => i.titleSnapshot).join(',')}</MockView>
    </MockView>
  );
}

describe('ecommerce CartProvider server merge', () => {
  it('merges local cart with server cart when signed in', async () => {
    // Mock stored cart in AsyncStorage
    const storedCart = {
      items: [
        {
          productId: 'p_local',
          qty: 1,
          unitPrice: 10,
          currency: 'USD',
          titleSnapshot: 'Local',
        },
      ],
      promoCode: undefined,
    };
    (AsyncStorage.getItem as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify(storedCart)
    );
    (AsyncStorage.setItem as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

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
      async mergeCart({ cart }) {
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
      },
    };

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
});
