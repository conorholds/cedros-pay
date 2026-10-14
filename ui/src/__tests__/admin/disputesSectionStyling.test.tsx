import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DisputesSection } from '../../components/admin/DisputesSection';
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

const DISPUTES = [
  {
    id: 'dsp-low-amount',
    source: 'stripe',
    status: 'needs_response',
    reason: 'fraudulent',
    amount: 500,
    currency: 'usd',
    metadata: {},
    createdAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'dsp-high-amount',
    source: 'stripe',
    status: 'won',
    reason: 'duplicate',
    amount: 9000,
    currency: 'usd',
    metadata: {},
    createdAt: '2026-03-11T00:00:00Z',
  },
];

describe('DisputesSection styling', () => {
  it('renders an EmptyState when there are no disputes', async () => {
    const fetchWithAuth = vi.fn(async () => ({ disputes: [] })) as IAdminAuthManager['fetchWithAuth'];

    render(
      <DisputesSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No disputes yet')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Disputes and chargebacks appear here/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry|refresh/i })).not.toBeInTheDocument();
  });

  it('reorders rows by amount when the sortable header is toggled', async () => {
    const fetchWithAuth = vi.fn(async () => ({ disputes: DISPUTES })) as IAdminAuthManager['fetchWithAuth'];

    render(
      <DisputesSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('USD 5.00')).toBeInTheDocument();
    });

    const amountFor = (id: string) => {
      const rows = screen.getAllByRole('row');
      return rows.findIndex((row) => within(row).queryByText(id.slice(0, 12)));
    };

    // Default sort is Created desc → newest (high-amount) row first.
    expect(amountFor('dsp-high-amount')).toBeLessThan(amountFor('dsp-low-amount'));

    // Toggle Amount sort ascending → lowest amount row first.
    fireEvent.click(screen.getByRole('button', { name: /Amount/ }));

    await waitFor(() => {
      expect(amountFor('dsp-low-amount')).toBeLessThan(amountFor('dsp-high-amount'));
    });
  });

  it('preserves stale dispute rows when a later authenticated refresh fails', async () => {
    let authenticated = true;
    const fetchWithAuth = vi.fn(async () => ({ disputes: DISPUTES })) as IAdminAuthManager['fetchWithAuth'];
    const authManager: IAdminAuthManager = {
      ...buildAuthManager(fetchWithAuth),
      isAuthenticated: () => authenticated,
    };

    const { rerender } = render(
      <DisputesSection
        serverUrl="https://api.example.com"
        pageSize={20}
        authManager={authManager}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('USD 90.00')).toBeInTheDocument();
    });

    authenticated = false;
    rerender(
      <DisputesSection
        serverUrl="https://api.example.com"
        pageSize={10}
        authManager={authManager}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load disputes')).toBeInTheDocument();
    });
    expect(screen.getByText('USD 90.00')).toBeInTheDocument();
    expect(screen.queryByText('No disputes yet')).not.toBeInTheDocument();
    expect(fetchWithAuth).toHaveBeenCalledTimes(1);
  });

  it('loads a detail and persists a status update through the declared POST route', async () => {
    const dispute = { ...DISPUTES[0] };
    const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
      if (path.startsWith('/admin/disputes?')) return { disputes: [dispute] };
      if (path === `/admin/disputes/${dispute.id}`) return dispute;
      if (path === `/admin/disputes/${dispute.id}/status`) {
        expect(options?.method).toBe('POST');
        expect(JSON.parse(String(options?.body))).toEqual({ status: 'under_review' });
        return { ...dispute, status: 'under_review' };
      }
      throw new Error(`Unexpected request: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <DisputesSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'View' }));
    expect(await screen.findByRole('heading', { level: 3 })).toHaveTextContent(
      'Dispute dsp-low-amou'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Under review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(
        `/admin/disputes/${dispute.id}/status`,
        { method: 'POST', body: JSON.stringify({ status: 'under_review' }) }
      );
      expect(screen.getByText('under_review')).toBeInTheDocument();
    });
  });

});
