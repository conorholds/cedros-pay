import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrdersSection } from '../../components/admin/OrdersSection';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';
import type { PaymentStats } from '../../components/admin/types';

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

const PAYMENT_STATS: PaymentStats = {
  totalRevenue: 12.5,
  totalTransactions: 1,
  activeProducts: 1,
  pendingRefunds: 0,
  revenueByMethod: { stripe: 12.5, x402: 0, credits: 0 },
  transactionsByMethod: { stripe: 1, x402: 0, credits: 0 },
  orders: {
    total: 1,
    paid: 1,
    refunded: 0,
    pending: 0,
    failed: 0,
    revenue: 12.5,
  },
};

function routeFetch(): IAdminAuthManager['fetchWithAuth'] {
  return vi.fn(async (path: string) => {
    if (path === '/admin/stats') {
      return { ...PAYMENT_STATS, truncated: true };
    }
    if (path.startsWith('/admin/orders?')) {
      return {
        orders: [
          {
            id: 'order-newest',
            source: 'stripe',
            purchaseId: 'order-newest',
            resourceId: 'prod_founders',
            status: 'paid',
            items: [],
            amount: 1250,
            amountAsset: 'USD',
            metadata: {},
            createdAt: '2026-03-11T00:00:00Z',
          },
        ],
        count: 1,
        total: 1,
        hasMore: false,
        truncated: true,
      };
    }
    return null;
  }) as IAdminAuthManager['fetchWithAuth'];
}

describe('OrdersSection truncation warnings', () => {
  it('shows warnings when stats or order scans are truncated', async () => {
    render(
      <OrdersSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(routeFetch())}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Order stats may be partial/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Order list may be partial/)).toBeInTheDocument();
  });
});
