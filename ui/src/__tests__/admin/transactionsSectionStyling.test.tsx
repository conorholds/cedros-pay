import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'cedros:admin';
import { TransactionsSection } from '../../components/admin/TransactionsSection';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';
import type { PaymentStats, Transaction } from '../../components/admin/types';

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

const TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-low',
    resourceId: 'res-low',
    method: 'stripe',
    amount: 5,
    currency: 'USD',
    status: 'completed',
    paidAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'txn-high',
    resourceId: 'res-high',
    method: 'x402',
    amount: 90,
    currency: 'USD',
    status: 'completed',
    paidAt: '2026-03-11T00:00:00Z',
  },
];

const PAYMENT_STATS: PaymentStats = {
  totalRevenue: 95,
  totalTransactions: 2,
  activeProducts: 1,
  pendingRefunds: 0,
  revenueByMethod: { stripe: 5, x402: 90, credits: 0 },
  transactionsByMethod: { stripe: 1, x402: 1, credits: 0 },
};

// Routes both /admin/stats and /admin/transactions through one mock fetcher.
function routeFetch(
  transactions: Transaction[],
  options: { statsTruncated?: boolean; transactionsTruncated?: boolean } = {}
): IAdminAuthManager['fetchWithAuth'] {
  return vi.fn(async (path: string) => {
    if (path.startsWith('/admin/transactions')) {
      return { transactions, truncated: options.transactionsTruncated === true };
    }
    if (path === '/admin/stats') {
      return { ...PAYMENT_STATS, truncated: options.statsTruncated === true };
    }
    return null;
  }) as IAdminAuthManager['fetchWithAuth'];
}

describe('TransactionsSection styling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the table frame and retries a first-load transaction error', async () => {
    let transactionAttempts = 0;
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path === '/admin/stats') return PAYMENT_STATS;
      if (path.startsWith('/admin/transactions')) {
        transactionAttempts += 1;
        if (transactionAttempts === 1) throw new Error('offline');
        return { transactions: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];
    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    expect(await screen.findByText('Failed to load transactions')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Method' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('No transactions yet')).toBeInTheDocument();
    expect(transactionAttempts).toBe(2);
  });

  it('renders an EmptyState when there are no transactions', async () => {
    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(routeFetch([]))}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Payment attempts will appear here/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|refresh/i })).not.toBeInTheDocument();
  });

  it('keeps rendering when supporting stats omit payment-method breakdowns', async () => {
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path === '/admin/stats') return {};
      if (path.startsWith('/admin/transactions')) return { transactions: [] };
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    expect(await screen.findByText('No transactions yet')).toBeInTheDocument();
    expect(screen.getAllByText('0 orders')).toHaveLength(3);
  });

  it('uses one stable host toast for supporting stats failures', async () => {
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path === '/admin/stats') throw new Error('offline');
      if (path.startsWith('/admin/transactions')) return { transactions: [] };
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Transactions data couldn't load.",
        {
          id: 'cedros-pay:transactions-load',
          description: 'Try again in a moment.',
        }
      );
    });
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Failed to load payment stats')).not.toBeInTheDocument();
  });

  it('replaces a refresh banner with the stable host toast while retaining table data', async () => {
    let transactionAttempts = 0;
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path === '/admin/stats') return PAYMENT_STATS;
      if (path.startsWith('/admin/transactions')) {
        transactionAttempts += 1;
        if (transactionAttempts === 1) return { transactions: TRANSACTIONS };
        throw new Error('offline');
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    expect(await screen.findByText('res-low')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Method'));
    fireEvent.click(await screen.findByRole('option', { name: 'Card' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Transactions data couldn't load.",
        {
          id: 'cedros-pay:transactions-load',
          description: 'Try again in a moment.',
        }
      );
    });
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Failed to load transactions')).not.toBeInTheDocument();
    expect(screen.getByText('res-low')).toBeInTheDocument();
  });

  it('reorders rows by amount when the sortable header is toggled', async () => {
    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(routeFetch(TRANSACTIONS))}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('res-low')).toBeInTheDocument();
    });

    const rowIndexFor = (resourceId: string) => {
      const rows = screen.getAllByRole('row');
      return rows.findIndex((row) => within(row).queryByText(resourceId));
    };

    // Default sort is Date desc → newest (high-amount) row first.
    expect(rowIndexFor('res-high')).toBeLessThan(rowIndexFor('res-low'));

    // Toggle Amount sort ascending → lowest amount row first.
    fireEvent.click(screen.getByRole('button', { name: /Amount/ }));

    await waitFor(() => {
      expect(rowIndexFor('res-low')).toBeLessThan(rowIndexFor('res-high'));
    });
  });

  it('shows warnings when stats or transaction scans are truncated', async () => {
    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(routeFetch(TRANSACTIONS, {
          statsTruncated: true,
          transactionsTruncated: true,
        }))}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Payment stats may be partial/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Transaction list may be partial/)).toBeInTheDocument();
  });

  it('marks pending payments as incomplete and warns operators not to trigger a second attempt', async () => {
    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(routeFetch([{
          ...TRANSACTIONS[0],
          status: 'pending',
        }]))}
      />
    );

    const status = await screen.findByText('Pending confirmation');
    expect(status).toHaveAttribute(
      'title',
      'Payment is not complete. Check again before asking the customer to retry.'
    );
    expect(screen.getByText('Do not retry yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
  });

  it('confirms a full Stripe refund and suppresses duplicate clicks while it is in flight', async () => {
    let resolveRefund: (() => void) | undefined;
    const refundPromise = new Promise<void>((resolve) => {
      resolveRefund = resolve;
    });
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path === '/admin/stats') return PAYMENT_STATS;
      if (path.startsWith('/admin/transactions')) return { transactions: [TRANSACTIONS[0]] };
      if (path === '/admin/stripe/refunds/txn-low/process') {
        await refundPromise;
        return { processed: true, status: 'succeeded', refundId: 're_123' };
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Refund' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Refund $5.00?');
    expect(screen.getByRole('dialog')).toHaveTextContent('Card · Stripe');
    expect(screen.getByRole('dialog')).toHaveTextContent('This action cannot be undone.');

    const confirm = screen.getByRole('button', { name: 'Confirm refund' });
    fireEvent.click(confirm);

    const inFlight = await screen.findByRole('button', { name: 'Refunding…' });
    expect(inFlight).toBeDisabled();
    fireEvent.click(inFlight);
    expect(fetchWithAuth).toHaveBeenCalledTimes(3);

    resolveRefund?.();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith(
      'Refund completed.',
      expect.objectContaining({ description: expect.stringContaining('Card · Stripe') })
    );
  });

  it('keeps a provider-pending Stripe refund visibly in flight without offering retry', async () => {
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path === '/admin/stats') return PAYMENT_STATS;
      if (path.startsWith('/admin/transactions')) return { transactions: [TRANSACTIONS[0]] };
      if (path === '/admin/stripe/refunds/txn-low/process') {
        return { processed: false, status: 'pending', refundId: 're_pending' };
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Refund' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm refund' }));

    expect(await screen.findByText('Refund unresolved — do not send a new payout')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
    expect(toast.warning).toHaveBeenCalledWith(
      'Refund confirmation pending.',
      expect.objectContaining({ description: expect.stringContaining('Do not submit it again') })
    );
  });
});
