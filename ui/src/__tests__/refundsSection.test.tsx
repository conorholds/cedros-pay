import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RefundsSection } from '../components/admin/RefundsSection';
import type { IAdminAuthManager } from '../components/admin/AdminAuthManager';

function buildAuthManager(
  fetchWithAuth: IAdminAuthManager['fetchWithAuth']
): IAdminAuthManager {
  return {
    getAuthMethod: () => 'cedros-login',
    isAuthenticated: () => true,
    setWalletSigner: () => {},
    setCedrosLoginAuth: () => {},
    createAuthHeaders: async () => ({ Authorization: 'Bearer token' }),
    fetchWithAuth,
  };
}

describe('RefundsSection', () => {
  it('renders credits and x402 refunds as read-only while keeping stripe processing', async () => {
    const fetchWithAuth: IAdminAuthManager['fetchWithAuth'] = vi.fn(async (path: string, options?: RequestInit) => {
      if (path.startsWith('/admin/refunds?')) {
        return {
          refunds: [
            {
              id: 'x402-ref-1',
              transactionId: 'tx-1',
              amount: 12.5,
              currency: 'USD',
              status: 'pending',
              createdAt: '2026-03-10T00:00:00Z',
            },
          ],
        };
      }
      if (path.startsWith('/admin/credits/refund-requests?')) {
        return {
          requests: [
            {
              id: 'cred-ref-1',
              originalTransactionId: 'cred-tx-1',
              userId: 'user-1',
              amountLamports: 1000,
              currency: 'USD',
              status: 'pending',
              createdAt: '2026-03-10T00:00:00Z',
            },
          ],
        };
      }
      if (path.startsWith('/admin/stripe/refunds?')) {
        return {
          refunds: [
            {
              id: 'stripe-ref-1',
              amount: 500,
              currency: 'USD',
              status: 'pending',
              createdAt: '2026-03-10T00:00:00Z',
            },
          ],
        };
      }
      if (path === '/admin/stripe/refunds/stripe-ref-1/process') {
        expect(options?.method).toBe('POST');
        return {};
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <RefundsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Credits refund requests are read-only in this admin surface.')).toBeInTheDocument();
      expect(screen.getByText('x402 refund approvals use the signed refund workflow, not this dashboard table.')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Process' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Process' }));

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith('/admin/stripe/refunds/stripe-ref-1/process', { method: 'POST' });
    });
  });
});
