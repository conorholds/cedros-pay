import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';

vi.mock('../../components/admin/sections', () => ({
  ProductsSection: ({ onDetailViewChange }: { onDetailViewChange?: (detail: boolean) => void }) => (
    <button type="button" onClick={() => onDetailViewChange?.(true)}>Open product detail</button>
  ),
  CouponsSection: () => null,
  TransactionsSection: () => null,
  RefundsSection: () => null,
}));

vi.mock('../../components/admin/InventorySection', () => ({
  InventorySection: () => null,
}));

vi.mock('../../components/admin/SubscriptionsSection', () => ({
  SubscriptionsSection: () => null,
}));

vi.mock('../../components/admin/OrdersSection', () => ({
  OrdersSection: () => null,
}));

vi.mock('../../components/admin/ReturnsSection', () => ({
  ReturnsSection: () => null,
}));

vi.mock('../../components/admin/DisputesSection', () => ({
  DisputesSection: () => null,
}));

import { CatalogSection } from '../../components/admin/CatalogSection';
import { TransactionsHubSection } from '../../components/admin/TransactionsHubSection';

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

describe('admin hub section headers', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/admin');
  });

  it('renders the active Catalog workflow title, description, then tabs', () => {
    render(<CatalogSection serverUrl="https://example.test" />);

    expect(screen.getByRole('heading', { level: 2, name: 'Products' })).toBeInTheDocument();
    expect(
      screen.getByText('Manage products, pricing, availability, and Stripe sync.')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Products',
      'Inventory',
      'Subscriptions',
      'Coupons',
    ]);
  });

  it('hides Catalog collection chrome while a product detail view is open', () => {
    render(<CatalogSection serverUrl="https://example.test" />);

    fireEvent.click(screen.getByRole('button', { name: 'Open product detail' }));

    expect(screen.queryByRole('heading', { level: 2, name: 'Products' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
  });

  it('renders the Transactions page title, description, then tabs', () => {
    render(<TransactionsHubSection serverUrl="https://example.test" />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Transactions' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Review completed payments across card, crypto, and credits.')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Transactions',
      'Orders',
      'Refunds',
      'Returns',
      'Disputes',
    ]);
  });

  it('updates the Transactions hub page title and description when tabs change', () => {
    render(<TransactionsHubSection serverUrl="https://example.test" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Orders' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Orders' })).toBeInTheDocument();
    expect(
      screen.getByText('Track purchase lifecycle, fulfillment status, and order revenue.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Review completed payments across card, crypto, and credits.')
    ).not.toBeInTheDocument();
  });

  it('never paints a gated Catalog tab before the visibility read settles', async () => {
    let releaseShopConfig: (() => void) | undefined;
    const shopConfigGate = new Promise<void>((resolve) => {
      releaseShopConfig = resolve;
    });
    const authManager = buildAuthManager(vi.fn(async (path: string) => {
      if (path.startsWith('/admin/config/shop')) {
        await shopConfigGate;
        return { config: { inventory_enabled: true, coupons_enabled: true } };
      }
      if (path === '/admin/subscriptions/settings') return { enabled: true, plans: [] };
      if (path === '/admin/v1/status') return { runtime: 'node', unsupportedRoutes: [] };
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth']);

    render(<CatalogSection serverUrl="https://example.test" authManager={authManager} />);

    // While the read is in flight only the permanent tab is committed, so no
    // gated workflow can render and then disappear.
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Products']);

    releaseShopConfig?.();

    await waitFor(() =>
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'Products',
        'Inventory',
        'Subscriptions',
        'Coupons',
      ])
    );
  });

  it('keeps a routed gated tab available while the visibility read is pending', () => {
    window.history.replaceState(
      null,
      '',
      '/admin?cedrosPaySectionId=cedros-pay:catalog&cedrosPayTabId=cedros-pay:subscriptions'
    );
    const authManager = buildAuthManager(vi.fn(
      () => new Promise(() => {})
    ) as unknown as IAdminAuthManager['fetchWithAuth']);

    render(<CatalogSection serverUrl="https://example.test" authManager={authManager} />);

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Products',
      'Subscriptions',
    ]);
    expect(
      screen.getByRole('tab', { name: 'Subscriptions', selected: true })
    ).toBeInTheDocument();
  });

  it('hides Catalog tabs disabled from Pay hub overview', async () => {
    const authManager = buildAuthManager(vi.fn(async (path: string) => {
      if (path.startsWith('/admin/config/shop')) {
        return {
          config: {
            inventory_enabled: false,
            coupons_enabled: false,
          },
        };
      }
      if (path === '/admin/subscriptions/settings') {
        return { enabled: false, plans: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth']);

    render(<CatalogSection serverUrl="https://example.test" authManager={authManager} />);

    await waitFor(() =>
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Products'])
    );
  });

  it('hides Transactions tabs disabled from Pay hub overview', async () => {
    const authManager = buildAuthManager(vi.fn(async (path: string) => {
      if (path.startsWith('/admin/config/shop')) {
        return {
          config: {
            refunds_enabled: false,
            returns_enabled: false,
          },
        };
      }
      if (path === '/admin/subscriptions/settings') {
        return { enabled: true, plans: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth']);

    render(<TransactionsHubSection serverUrl="https://example.test" authManager={authManager} />);

    await waitFor(() =>
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'Transactions',
        'Orders',
        'Disputes',
      ])
    );
  });

  it('hides workflows explicitly unsupported by the Wasm runtime', async () => {
    const authManager = buildAuthManager(vi.fn(async (path: string) => {
      if (path.startsWith('/admin/config/shop')) return { config: {} };
      if (path === '/admin/subscriptions/settings') return { enabled: true, plans: [] };
      if (path === '/admin/v1/status') {
        return {
          runtime: 'wasm',
          unsupportedRoutes: [
            'cedros-pay:admin-disputes-list',
          ],
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth']);

    render(<TransactionsHubSection serverUrl="https://example.test" authManager={authManager} />);

    await waitFor(() =>
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
        'Transactions',
        'Orders',
        'Refunds',
        'Returns',
      ])
    );
  });
});
