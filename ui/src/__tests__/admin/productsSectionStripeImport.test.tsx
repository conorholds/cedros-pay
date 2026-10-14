import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductsSection } from '../../components/admin/ProductsSection';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';

function buildAuthManager(
  fetchWithAuth: IAdminAuthManager['fetchWithAuth']
): IAdminAuthManager {
  return {
    getAuthMethod: () => 'cedros-login',
    isAuthenticated: () => true,
    setCedrosLoginAuth: () => {},
    createAuthHeaders: async () => ({ Authorization: 'Bearer token' }),
    fetchWithAuth,
  };
}

const STRIPE_PRODUCT = {
  id: 'consulting',
  title: 'Consulting',
  description: 'One hour',
  fiatAmountCents: 12000,
  fiatCurrency: 'USD',
  cryptoAtomicAmount: 0,
  cryptoToken: 'USDC',
  stripeProductId: 'prod_123',
  stripePriceId: 'price_123',
  active: true,
};

function featureConfigResponse(path: string) {
  if (path.startsWith('/admin/config/shop')) {
    return {
      config: {
        refunds_enabled: true,
        returns_enabled: true,
        inventory_enabled: true,
        coupons_enabled: true,
      },
    };
  }
  if (path === '/admin/subscriptions/settings') {
    return { enabled: true, plans: [] };
  }
  return null;
}

describe('ProductsSection Stripe import', () => {
  it('previews Stripe products, imports the selected product, and refreshes the list', async () => {
    let productFetches = 0;
    const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
      const featureConfig = featureConfigResponse(path);
      if (featureConfig) return featureConfig;

      if (path === '/admin/products/stripe-import-preview?limit=100') {
        return {
          products: [
            {
              title: 'Consulting',
              description: 'One hour',
              stripeProductId: 'prod_123',
              stripePriceId: 'price_123',
              amountCents: 12000,
              currency: 'USD',
              proposedProductId: 'consulting',
              status: 'new',
              importable: true,
              warnings: [],
            },
          ],
          importable: 1,
          linked: 0,
          conflicts: 0,
          warnings: 0,
        };
      }
      if (path === '/admin/products/import-stripe' && options?.method === 'POST') {
        return { imported: 1, skipped: 0, products: [STRIPE_PRODUCT] };
      }

      productFetches += 1;
      return {
        products: productFetches > 1 ? [STRIPE_PRODUCT] : [],
        total: productFetches > 1 ? 1 : 0,
      };
    }) as unknown as IAdminAuthManager['fetchWithAuth'];

    render(
      <ProductsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /Import from Stripe/i }));
    expect(await screen.findByText('Stripe import preview')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Import 1' }));

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith('/admin/products/import-stripe', {
        method: 'POST',
        body: JSON.stringify({ stripeProductIds: ['prod_123'] }),
      });
    });
    await waitFor(() => {
      expect(screen.getAllByText('Consulting').length).toBeGreaterThan(0);
    });
  });

  it('surfaces Stripe preview failures inline', async () => {
    const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
      const featureConfig = featureConfigResponse(path);
      if (featureConfig) return featureConfig;

      if (path === '/admin/products/stripe-import-preview?limit=100' && !options) {
        throw new Error('Stripe is not configured');
      }

      return { products: [], total: 0 };
    }) as unknown as IAdminAuthManager['fetchWithAuth'];

    render(
      <ProductsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: /Import from Stripe/i }));

    await waitFor(() => {
      expect(screen.getByText('Stripe is not configured')).toBeInTheDocument();
    });
  });

  it('renders imported Stripe products without a default price', async () => {
    const fetchWithAuth = vi.fn(async (path: string) => {
      const featureConfig = featureConfigResponse(path);
      if (featureConfig) return featureConfig;

      return {
        products: [
          {
            id: 'prod_without_price',
            title: 'Draft product',
            description: 'No default price',
            stripeProductId: 'prod_without_price',
            active: true,
          },
        ],
        total: 1,
      };
    }) as unknown as IAdminAuthManager['fetchWithAuth'];

    render(
      <ProductsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    expect(await screen.findByText('Draft product')).toBeInTheDocument();
    expect(screen.getByText('No fiat price')).toBeInTheDocument();
    expect(screen.queryByText('$NaN')).not.toBeInTheDocument();
  });

  it('syncs a local product to Stripe from the product row', async () => {
    const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
      const featureConfig = featureConfigResponse(path);
      if (featureConfig) return featureConfig;

      if (path === '/admin/products/consulting/sync-stripe' && options?.method === 'POST') {
        return {
          product: STRIPE_PRODUCT,
          createdStripeProduct: true,
          createdStripePrice: true,
          replacedStripePrice: false,
          warnings: [],
        };
      }

      return { products: [STRIPE_PRODUCT], total: 1 };
    }) as unknown as IAdminAuthManager['fetchWithAuth'];

    render(
      <ProductsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Consulting actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sync Stripe' }));

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith('/admin/products/consulting/sync-stripe', {
        method: 'POST',
      });
    });
  });

  it('makes a product inactive from its row menu', async () => {
    const fetchMock = vi.fn(async (path: string, options?: RequestInit) => {
      const featureConfig = featureConfigResponse(path);
      if (featureConfig) return featureConfig;
      if (path === '/admin/products/consulting' && options?.method === 'PUT') {
        return { ...STRIPE_PRODUCT, active: false };
      }
      return { products: [STRIPE_PRODUCT], total: 1 };
    });
    const fetchWithAuth = fetchMock as unknown as IAdminAuthManager['fetchWithAuth'];

    render(
      <ProductsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Consulting actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Make inactive' }));

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith('/admin/products/consulting', {
        method: 'PUT',
        body: expect.any(String),
      });
    });
    const updateCall = fetchMock.mock.calls.find(
      ([path, options]) => path === '/admin/products/consulting' && options?.method === 'PUT'
    );
    expect(JSON.parse(String(updateCall?.[1]?.body)).active).toBe(false);
    expect(await screen.findByText('Inactive')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Consulting actions' }));
    expect(await screen.findByRole('menuitem', { name: 'Make active' })).toBeInTheDocument();
  });

  it('confirms and deletes a product from its row menu', async () => {
    const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
      const featureConfig = featureConfigResponse(path);
      if (featureConfig) return featureConfig;
      if (path === '/admin/products/consulting' && options?.method === 'DELETE') {
        return { deleted: true };
      }
      return { products: [STRIPE_PRODUCT], total: 1 };
    }) as unknown as IAdminAuthManager['fetchWithAuth'];

    render(
      <ProductsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Consulting actions' }));
    const deleteItem = await screen.findByRole('menuitem', { name: 'Delete' });
    expect(deleteItem).toHaveClass('cedros-dropdown-menu__item--danger');
    fireEvent.click(deleteItem);
    expect(screen.getByRole('heading', { name: 'Delete “Consulting”?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete product' }));

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith('/admin/products/consulting', {
        method: 'DELETE',
      });
    });
    expect(await screen.findByText('No products yet')).toBeInTheDocument();
  });

  it('surfaces a failed product delete without removing the row', async () => {
    const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
      const featureConfig = featureConfigResponse(path);
      if (featureConfig) return featureConfig;
      if (path === '/admin/products/consulting' && options?.method === 'DELETE') {
        throw new Error('Product is referenced by inventory history');
      }
      return { products: [STRIPE_PRODUCT], total: 1 };
    }) as unknown as IAdminAuthManager['fetchWithAuth'];

    render(
      <ProductsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Consulting actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete product' }));

    expect(await screen.findByText('Failed to delete “Consulting”')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consulting actions' })).toBeInTheDocument();
  });

  it('syncs every active catalog product to Stripe from one action', async () => {
    const products = [
      STRIPE_PRODUCT,
      {
        ...STRIPE_PRODUCT,
        id: 'developer',
        title: 'Developer',
        stripeProductId: undefined,
        stripePriceId: undefined,
      },
      {
        ...STRIPE_PRODUCT,
        id: 'draft-addon',
        title: 'Draft add-on',
        active: false,
      },
    ];
    const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
      const featureConfig = featureConfigResponse(path);
      if (featureConfig) return featureConfig;
      if (path.startsWith('/admin/products/') && options?.method === 'POST') {
        return { createdStripeProduct: true, createdStripePrice: true };
      }
      return { products, total: products.length };
    }) as unknown as IAdminAuthManager['fetchWithAuth'];

    render(
      <ProductsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Sync catalog to Stripe' }));

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith('/admin/products/consulting/sync-stripe', {
        method: 'POST',
      });
      expect(fetchWithAuth).toHaveBeenCalledWith('/admin/products/developer/sync-stripe', {
        method: 'POST',
      });
    });
    expect(fetchWithAuth).not.toHaveBeenCalledWith(
      '/admin/products/draft-addon/sync-stripe',
      expect.anything()
    );
  });

  it('keeps the last empty state in place during a background refresh', async () => {
    let productFetches = 0;
    let finishRefresh: (() => void) | undefined;
    const fetchWithAuth = vi.fn(async (path: string) => {
      const featureConfig = featureConfigResponse(path);
      if (featureConfig) return featureConfig;
      if (!path.startsWith('/admin/products?')) {
        throw new Error(`Unexpected path: ${path}`);
      }

      productFetches += 1;
      if (productFetches === 1) return { products: [], total: 0 };
      return new Promise<{ products: never[]; total: number }>((resolve) => {
        finishRefresh = () => resolve({ products: [], total: 0 });
      });
    }) as unknown as IAdminAuthManager['fetchWithAuth'];

    render(
      <ProductsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    expect(await screen.findByText('No products yet')).toBeInTheDocument();
    window.dispatchEvent(new Event('cedros-pay:data-invalidated'));
    await waitFor(() => expect(productFetches).toBe(2));

    expect(screen.getByText('No products yet')).toBeInTheDocument();
    expect(screen.queryByText('Loading products…')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');

    finishRefresh?.();
    await waitFor(() => expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'false'));
  });
});
