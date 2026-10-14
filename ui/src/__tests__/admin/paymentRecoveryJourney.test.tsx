import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'cedros:admin';
import { TransactionsSection } from '../../components/admin/TransactionsSection';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';
import type { Transaction } from '../../components/admin/types';

const payment: Transaction = {
  id: 'payment-one', resourceId: 'Product with a long name <script>merchant text</script>',
  amount: 15, amountMinor: 1500, refundedAmountMinor: 500, currency: 'USD',
  method: 'stripe', status: 'completed', paidAt: '2026-09-22T00:00:00Z', providerReference: 'pi_one',
};
const stats = {
  totalRevenue: 15, totalTransactions: 1, revenueByMethod: { stripe: 15 }, transactionsByMethod: { stripe: 1 },
};
function auth(fetchWithAuth: IAdminAuthManager['fetchWithAuth']): IAdminAuthManager {
  return {
    getAuthMethod: () => 'host-session', isAuthenticated: () => true,
    setCedrosLoginAuth: () => undefined, createAuthHeaders: async () => ({}), fetchWithAuth,
  };
}

describe('operator payment recovery journeys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recovers a lost refund response across remount, then confirms the same refund without a new payout', async () => {
    let attempted = false;
    let settled = false;
    const fetch = vi.fn(async (path: string, options?: RequestInit) => {
      if (path === '/admin/stats') return stats;
      if (path.startsWith('/admin/transactions')) return { transactions: [{
        ...payment, status: settled ? 'refunded' : 'completed',
        refundedAmountMinor: settled ? 1500 : 500,
        refundProgress: attempted ? {
          status: settled ? 'completed' : 'unresolved', refundId: 're_one', requestedAmountMinor: 1000,
        } : null,
      }] };
      if (path === '/admin/stripe/refunds/payment-one/process' && options?.method === 'POST') {
        if (!attempted) {
          attempted = true;
          throw new Error('timeout with secret provider payload sk_test_DO_NOT_DISPLAY');
        }
        settled = true;
        return { processed: true, status: 'succeeded', refundId: 're_one' };
      }
      throw new Error('unexpected route');
    });
    const manager = auth(fetch as IAdminAuthManager['fetchWithAuth']);
    const first = render(<TransactionsSection serverUrl="" authManager={manager} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Refund' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Refund $10.00?');
    expect(screen.getByRole('dialog')).toHaveTextContent('payment-one');
    await user.click(screen.getByRole('button', { name: 'Confirm refund' }));
    expect(await screen.findByText(/Refund outcome for payment-one is unknown/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('DO_NOT_DISPLAY');
    expect(toast.success).not.toHaveBeenCalled();
    first.unmount();

    render(<TransactionsSection serverUrl="" authManager={manager} />);
    expect(await screen.findByText(/Refund unresolved/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
    expect(screen.getByText(payment.resourceId)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText('pi_one')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Resume same refund' }));
    await user.click(screen.getByRole('button', { name: 'Confirm refund' }));
    expect(await screen.findByText('Refunded')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledOnce();
    expect(fetch.mock.calls.filter(([, options]) => options?.method === 'POST').map(([path]) => path))
      .toEqual(['/admin/stripe/refunds/payment-one/process', '/admin/stripe/refunds/payment-one/process']);
  });

  it('does not replace newer payment state with a delayed response from an older filter', async () => {
    let resolveOld!: (value: unknown) => void;
    let reads = 0;
    const fetch = vi.fn(async (path: string) => {
      if (path === '/admin/stats') return stats;
      reads += 1;
      if (reads === 1) return new Promise(resolve => { resolveOld = resolve; });
      return { transactions: [{ ...payment, status: 'refunded' }] };
    });
    render(<TransactionsSection serverUrl="" authManager={auth(fetch as IAdminAuthManager['fetchWithAuth'])} />);
    fireEvent.click(screen.getByLabelText('Method'));
    fireEvent.click(await screen.findByRole('option', { name: 'Card' }));
    expect(await screen.findByText('Refunded')).toBeInTheDocument();
    await act(async () => resolveOld({ transactions: [payment] }));
    expect(screen.getByText('Refunded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument();
  });

  it('warns when the displayed payment snapshot is stale and disables refund actions', async () => {
    let reads = 0;
    const fetch = vi.fn(async (path: string) => {
      if (path === '/admin/stats') return { ...stats, revenueIncludesNonUsd: true };
      if (++reads === 1) return { transactions: [payment] };
      throw new Error('offline');
    });
    render(<TransactionsSection serverUrl="" authManager={auth(fetch as IAdminAuthManager['fetchWithAuth'])} />);
    await screen.findByRole('button', { name: 'Refund' });
    const revenue = screen.getByText('Revenue').closest<HTMLElement>('.cedros-data-metric')!;
    expect(within(revenue).getByText('See transactions')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Method'));
    fireEvent.click(await screen.findByRole('option', { name: 'Card' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('last successful load'));
    expect(screen.getByRole('button', { name: 'Refund' })).toBeDisabled();
  });
});
