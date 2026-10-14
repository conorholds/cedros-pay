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
    setCedrosLoginAuth: () => {},
    createAuthHeaders: async () => ({ Authorization: 'Bearer token' }),
    fetchWithAuth,
  };
}

function buildFetch(signingStarted = false): IAdminAuthManager['fetchWithAuth'] {
  return vi.fn(async (path: string, options?: RequestInit) => {
    if (path.startsWith('/admin/config/stripe')) {
      return { category: 'stripe', config: { enabled: true }, updatedAt: '', secretsRedacted: true };
    }
    if (path.startsWith('/admin/config/cedros_login')) {
      return {
        category: 'cedros_login',
        config: { enabled: true, credits_enabled: true },
        updatedAt: '',
        secretsRedacted: true,
      };
    }
    if (path.startsWith('/admin/config/x402')) {
      return { category: 'x402', config: { enabled: true }, updatedAt: '', secretsRedacted: true };
    }
    if (path.startsWith('/admin/refunds?')) {
      return {
        refunds: [
          {
            id: 'x402-ref-1',
            transactionId: null,
            amount: 12.5,
            currency: 'USDC',
            status: 'pending',
            recipientWallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
            originalPurchaseId: '5jX8onChainSignature1111111111111111111111111111111',
            signingStarted,
            paymentMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            refundAmountMicrounits: 12_500_000,
            tokenDecimals: 6,
            providerErrorCode: signingStarted ? 'refund_signer_unavailable' : null,
            providerRetryable: signingStarted ? true : null,
            createdAt: '2026-03-10T00:00:00Z',
          },
        ],
      };
    }
    if (path.startsWith('/admin/credits/refund-requests?')) {
      return { refunds: [] };
    }
    if (path.startsWith('/admin/stripe/refunds?')) {
      return {
        refunds: [
          { id: 'stripe-ref-1', amount: 500, currency: 'USD', status: 'pending', createdAt: '2026-03-10T00:00:00Z' },
        ],
      };
    }
    if (
      path === '/admin/refunds/x402-ref-1/process' ||
      path === '/admin/refunds/x402-ref-1/deny' ||
      path === '/admin/stripe/refunds/stripe-ref-1/process'
    ) {
      expect(options?.method).toBe('POST');
      return {};
    }
    throw new Error(`Unexpected path: ${path}`);
  }) as IAdminAuthManager['fetchWithAuth'];
}

describe('RefundsSection fail-closed actions', () => {
  it('refreshes a submitted Solana refund to completion when the operator returns', async () => {
    let completed = false;
    const base = buildFetch(true);
    const fetch = vi.fn(async (path: string, options?: RequestInit) => {
      if (path.startsWith('/admin/refunds?')) return { refunds: [{
        id: 'chain-refund', amount: 5, currency: 'USD', status: completed ? 'completed' : 'processing',
        signingStarted: true, createdAt: '2026-09-22T00:00:00Z',
        refundAmountMicrounits: 5_000_000, tokenDecimals: 6,
        paymentMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      }] };
      return base(path, options);
    });
    render(<RefundsSection serverUrl="" authManager={buildAuthManager(fetch as IAdminAuthManager['fetchWithAuth'])} />);
    expect(await screen.findByText('Confirmation pending — do not resend')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Process' })).not.toBeInTheDocument();
    completed = true;
    fireEvent(window, new Event('online'));
    expect(await screen.findByText('completed')).toBeInTheDocument();
    expect(screen.queryByText('Confirmation pending — do not resend')).not.toBeInTheDocument();
    expect(fetch.mock.calls.every(([, options]) => !options?.method)).toBe(true);
  });

  it('recovers a settings outage without describing unknown rails as disabled or logging provider secrets', async () => {
    let offline = true;
    const base = buildFetch();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const fetch = vi.fn(async (path: string, options?: RequestInit) => {
        if (offline) throw new Error('provider-secret-DO_NOT_LOG');
        return base(path, options);
      });
      render(<RefundsSection serverUrl="" authManager={buildAuthManager(fetch as IAdminAuthManager['fetchWithAuth'])} />);
      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load refund payment settings');
      expect(screen.queryByText('Refund processing unavailable')).not.toBeInTheDocument();
      expect(JSON.stringify(log.mock.calls)).not.toContain('DO_NOT_LOG');
      offline = false;
      fireEvent(window, new Event('online'));
      expect(await screen.findByText('Stripe refunds')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } finally {
      log.mockRestore();
    }
  });

  it('confirms the exact x402 payout and suppresses duplicate Process clicks', async () => {
    const fetchWithAuth = buildFetch();
    render(
      <RefundsSection serverUrl="https://api.example.com" authManager={buildAuthManager(fetchWithAuth)} />
    );

    expect(await screen.findByText('Stripe refunds')).toBeInTheDocument();
    expect(screen.getByText('Credits refunds')).toBeInTheDocument();
    expect(screen.getByText('x402 refund requests')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Process' }));
    expect(screen.getByText(/Process 12[.,]5 USDC refund\?/)).toBeInTheDocument();
    expect(screen.getAllByText(/12[.,]5 USDC/).length).toBeGreaterThan(0);
    expect(screen.getByText(/one 12[.,]5 USDC payout on Solana to the original payer/)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Process refund' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(
        '/admin/refunds/x402-ref-1/process',
        { method: 'POST' }
      );
    });
    expect(
      vi.mocked(fetchWithAuth).mock.calls.filter(([path]) => path === '/admin/refunds/x402-ref-1/process')
    ).toHaveLength(1);

  });

  it('allows a never-started pending request to be denied', async () => {
    const fetchWithAuth = buildFetch();
    render(
      <RefundsSection serverUrl="https://api.example.com" authManager={buildAuthManager(fetchWithAuth)} />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Deny' }));
    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(
        '/admin/refunds/x402-ref-1/deny',
        { method: 'POST' }
      );
    });
  });

  it('only offers an exact retry after signing has started', async () => {
    const fetchWithAuth = buildFetch(true);
    render(
      <RefundsSection serverUrl="https://api.example.com" authManager={buildAuthManager(fetchWithAuth)} />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Retry same refund' }));
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument();
    expect(screen.getByText('Refund Signer Unavailable — retry this request')).toBeInTheDocument();
    expect(screen.getByText(/exact previously signed Solana transaction/)).toBeInTheDocument();
    const retryButtons = screen.getAllByRole('button', { name: 'Retry same refund' });
    fireEvent.click(retryButtons[retryButtons.length - 1]);
    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(
        '/admin/refunds/x402-ref-1/process',
        { method: 'POST' }
      );
    });
  });

  it('hides disabled credits and x402 refund methods without fetching them', async () => {
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path.startsWith('/admin/config/stripe')) {
        return { category: 'stripe', config: { enabled: true }, updatedAt: '', secretsRedacted: true };
      }
      if (path.startsWith('/admin/config/cedros_login')) {
        return {
          category: 'cedros_login',
          config: { enabled: true, credits_enabled: false },
          updatedAt: '',
          secretsRedacted: true,
        };
      }
      if (path.startsWith('/admin/config/x402')) {
        return { category: 'x402', config: { enabled: false }, updatedAt: '', secretsRedacted: true };
      }
      if (path.startsWith('/admin/stripe/refunds?')) {
        return { refunds: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    render(
      <RefundsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth as IAdminAuthManager['fetchWithAuth'])}
      />
    );

    expect(await screen.findByText('Stripe refunds')).toBeInTheDocument();
    expect(screen.queryByText('Refund processing unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('Credits refunds')).not.toBeInTheDocument();
    expect(screen.queryByText('x402 refund requests')).not.toBeInTheDocument();

    const paths = fetchWithAuth.mock.calls.map(([path]) => path);
    expect(paths.some((path) => path.startsWith('/admin/credits/refund-requests'))).toBe(false);
    expect(paths.some((path) => path.startsWith('/admin/refunds?'))).toBe(false);
  });
});
