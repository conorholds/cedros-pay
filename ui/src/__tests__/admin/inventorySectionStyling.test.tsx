import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventorySection } from '../../components/admin/InventorySection';
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

const PRODUCTS = [
  { id: 'prod-1', title: 'Widget', description: 'Widget', fiatAmountCents: 0, fiatCurrency: 'usd', cryptoAtomicAmount: 0, cryptoToken: 'USDC' },
];

const ADJUSTMENTS = [
  { id: 'adj-small', tenantId: 't', productId: 'prod-1', delta: 1, quantityBefore: 4, quantityAfter: 5, createdAt: '2026-03-10T00:00:00Z' },
  { id: 'adj-large', tenantId: 't', productId: 'prod-1', delta: 9, quantityBefore: 5, quantityAfter: 14, createdAt: '2026-03-11T00:00:00Z' },
];

/** Routes fetches by path: product list vs. per-product adjustments. */
function routedFetch() {
  return vi.fn(async (path: string) => {
    if (path.includes('/inventory/adjustments')) {
      return { adjustments: ADJUSTMENTS };
    }
    return PRODUCTS;
  }) as unknown as IAdminAuthManager['fetchWithAuth'];
}

describe('InventorySection styling', () => {
  it('prompts to select a product via EmptyState before any product is chosen', async () => {
    render(
      <InventorySection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(routedFetch())}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Select a product')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Choose a product above to view its inventory adjustment history/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|refresh/i })).not.toBeInTheDocument();
  });

  it('reorders adjustments by delta when the sortable header is toggled', async () => {
    render(
      <InventorySection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(routedFetch())}
      />
    );

    // Open the FormDropdown (named by its "Select Product" label) and pick the product.
    fireEvent.click(await screen.findByRole('button', { name: /Select Product/i }));
    fireEvent.click(await screen.findByRole('option', { name: 'Widget' }));

    await waitFor(() => {
      expect(screen.getByText('+9')).toBeInTheDocument();
    });

    const rowIndexFor = (delta: string) => {
      const rows = screen.getAllByRole('row');
      return rows.findIndex((row) => within(row).queryByText(delta));
    };

    // Default sort is Date desc → newest (delta +9) row first.
    expect(rowIndexFor('+9')).toBeLessThan(rowIndexFor('+1'));

    // Toggle Delta sort ascending → smallest delta row first.
    fireEvent.click(screen.getByRole('button', { name: /Delta/ }));

    await waitFor(() => {
      expect(rowIndexFor('+1')).toBeLessThan(rowIndexFor('+9'));
    });
  });
});
