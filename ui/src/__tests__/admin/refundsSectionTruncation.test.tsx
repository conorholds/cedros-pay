import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RefundsSection } from '../../components/admin/RefundsSection';
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

function routeFetch(): IAdminAuthManager['fetchWithAuth'] {
  return vi.fn(async (path: string) => {
    if (path.startsWith('/admin/config/x402')) {
      return { config: { enabled: true } };
    }
    if (path.startsWith('/admin/config/')) {
      return { config: {} };
    }
    if (path.startsWith('/admin/refunds?')) {
      return {
        refunds: [
          {
            id: 'refund-newest',
            paymentSignature: 'sig_1',
            amount: 100,
            status: 'pending',
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

describe('RefundsSection truncation warning', () => {
  it('does not fetch or show stale truncation state while refund routes are unavailable', async () => {
    const fetchWithAuth = routeFetch();
    render(
      <RefundsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    expect(await screen.findByText('Refund processing unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/Refund list may be partial/)).not.toBeInTheDocument();
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });
});
