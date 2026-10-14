import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReturnsSection } from '../../components/admin/ReturnsSection';
import type {
  AdminAuthHeaders,
  IAdminAuthManager,
} from '../../components/admin/AdminAuthManager';

interface ReturnRow {
  id: string;
  tenantId: string;
  orderId: string;
  status: string;
  items: Array<{ productId: string; quantity: number }>;
  metadata: Record<string, string>;
  createdAt: string;
}

class FakeAuthManager implements IAdminAuthManager {
  authenticated = true;

  fetchCount = 0;

  calls: Array<{ path: string; options?: RequestInit }> = [];

  constructor(private readonly returns: ReturnRow[]) {}

  getAuthMethod() {
    return 'cedros-login' as const;
  }

  isAuthenticated() {
    return this.authenticated;
  }

  setCedrosLoginAuth(_token: string | null, _isAdmin?: boolean) {}

  async createAuthHeaders(): Promise<AdminAuthHeaders> {
    return { Authorization: 'Bearer test' };
  }

  async fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T> {
    this.fetchCount += 1;
    this.calls.push({ path, options });
    if (path.startsWith('/admin/returns?')) {
      return { returns: this.returns } as T;
    }
    const detailMatch = path.match(/^\/admin\/returns\/([^/]+)$/);
    if (detailMatch) {
      const row = this.returns.find((r) => r.id === decodeURIComponent(detailMatch[1]));
      if (row) return row as T;
    }
    const statusMatch = path.match(/^\/admin\/returns\/([^/]+)\/status$/);
    if (statusMatch) {
      const row = this.returns.find((r) => r.id === decodeURIComponent(statusMatch[1]));
      const body = JSON.parse(String(options?.body ?? '{}')) as { status?: string };
      if (row) return { ...row, status: body.status ?? row.status } as T;
    }
    throw new Error(`Unexpected path: ${path}`);
  }
}

describe('ReturnsSection styling', () => {
  it('renders the shared EmptyState when there are no returns', async () => {
    render(<ReturnsSection serverUrl="https://example.test" authManager={new FakeAuthManager([])} />);

    expect(await screen.findByText('No returns yet')).toBeInTheDocument();
    expect(
      screen.getByText('No return requests have been created yet.')
    ).toBeInTheDocument();
  });

  it('reorders rows when a sortable header is toggled', async () => {
    const rows: ReturnRow[] = [
      { id: 'r1', tenantId: 't', orderId: 'order-aaa', status: 'requested', items: [{ productId: 'p', quantity: 1 }], metadata: {}, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'r2', tenantId: 't', orderId: 'order-zzz', status: 'approved', items: [{ productId: 'p', quantity: 1 }], metadata: {}, createdAt: '2026-02-01T00:00:00Z' },
    ];
    render(<ReturnsSection serverUrl="https://example.test" authManager={new FakeAuthManager(rows)} />);

    await screen.findByText('order-aaa');

    const orderIdHeader = screen.getByRole('button', { name: /Order ID/ });
    fireEvent.click(orderIdHeader); // ascending by order id

    await waitFor(() => {
      const cells = screen.getAllByRole('cell').filter((c) => c.querySelector('code'));
      expect(within(cells[0]).getByText('order-aaa')).toBeInTheDocument();
    });

    fireEvent.click(orderIdHeader); // descending by order id

    await waitFor(() => {
      const cells = screen.getAllByRole('cell').filter((c) => c.querySelector('code'));
      expect(within(cells[0]).getByText('order-zzz')).toBeInTheDocument();
    });
  });

  it('preserves stale return rows when a later authenticated refresh fails', async () => {
    const rows: ReturnRow[] = [
      { id: 'r1', tenantId: 't', orderId: 'order-stale', status: 'requested', items: [{ productId: 'p', quantity: 1 }], metadata: {}, createdAt: '2026-01-01T00:00:00Z' },
    ];
    const authManager = new FakeAuthManager(rows);
    const { rerender } = render(
      <ReturnsSection serverUrl="https://example.test" pageSize={20} authManager={authManager} />
    );

    await screen.findByText('order-stale');

    authManager.authenticated = false;
    rerender(<ReturnsSection serverUrl="https://example.test" pageSize={10} authManager={authManager} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load returns')).toBeInTheDocument();
    });
    expect(screen.getByText('order-stale')).toBeInTheDocument();
    expect(screen.queryByText('No returns yet')).not.toBeInTheDocument();
    expect(authManager.fetchCount).toBe(1);
  });

  it('updates return status with the server POST contract', async () => {
    const rows: ReturnRow[] = [
      { id: 'r1', tenantId: 't', orderId: 'order-aaa', status: 'requested', items: [{ productId: 'p', quantity: 1 }], metadata: {}, createdAt: '2026-01-01T00:00:00Z' },
    ];
    const authManager = new FakeAuthManager(rows);
    render(<ReturnsSection serverUrl="https://example.test" authManager={authManager} />);

    await screen.findByText('order-aaa');
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    await screen.findByText('Items (1)');

    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    fireEvent.click(screen.getByRole('option', { name: 'Approved' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => {
      const statusCall = authManager.calls.find((call) => call.path === '/admin/returns/r1/status');
      expect(statusCall?.options?.method).toBe('POST');
      expect(statusCall?.options?.body).toBe(JSON.stringify({ status: 'approved' }));
    });
  });
});
