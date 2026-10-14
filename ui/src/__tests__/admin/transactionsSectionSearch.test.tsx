import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionsSection } from '../../components/admin/TransactionsSection';
import { paginationPages } from '../../components/admin/AdminPagination';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';
import type { Transaction } from '../../components/admin/types';

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

function txn(id: string, resourceId: string): Transaction {
  return {
    id,
    resourceId,
    method: 'stripe',
    amount: 10,
    currency: 'USD',
    status: 'completed',
    paidAt: '2026-03-10T00:00:00Z',
  };
}

const ALL = [txn('txn-alpha', 'res-alpha'), txn('txn-beta', 'res-beta')];

describe('TransactionsSection server-side search and paging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends the settled term to the server and renders the filtered page', async () => {
    const paths: string[] = [];
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path === '/admin/stats') return {};
      if (path.startsWith('/admin/transactions')) {
        paths.push(path);
        const term = new URL(path, 'https://x.test').searchParams.get('search');
        const rows = term
          ? ALL.filter((row) => row.resourceId.includes(term) || row.id.includes(term))
          : ALL;
        return { transactions: rows, total: rows.length, hasMore: false, search: term };
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    expect(await screen.findByText('res-beta')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'alpha' } });

    await waitFor(() => {
      expect(screen.queryByText('res-beta')).not.toBeInTheDocument();
    });
    expect(screen.getByText('res-alpha')).toBeInTheDocument();
    // The term must reach the server: filtering the page in hand would leave
    // matches on later pages invisible.
    expect(paths.some((path) => path.includes('search=alpha'))).toBe(true);
  });

  it('says so when the runtime ignores the search parameter, and stops resending it', async () => {
    const paths: string[] = [];
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path === '/admin/stats') return {};
      if (path.startsWith('/admin/transactions')) {
        paths.push(path);
        // An older runtime: returns everything and never echoes `search`.
        return { transactions: ALL };
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    expect(await screen.findByText('res-alpha')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'alpha' } });

    expect(await screen.findByText(/can't search transactions/)).toBeInTheDocument();
    // Both rows stay visible rather than pretending the list was filtered.
    expect(screen.getByText('res-beta')).toBeInTheDocument();

    const searchRequests = paths.filter((path) => path.includes('search=')).length;
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'alphab' } });
    await waitFor(() => {
      expect(paths.filter((path) => path.includes('search=')).length).toBe(searchRequests);
    });
  });

  it('pages through a known total and restarts at page one when filters change', async () => {
    const offsets: number[] = [];
    const fetchWithAuth = vi.fn(async (path: string) => {
      if (path === '/admin/stats') return {};
      if (path.startsWith('/admin/transactions')) {
        const params = new URL(path, 'https://x.test').searchParams;
        const offset = Number(params.get('offset') ?? 0);
        offsets.push(offset);
        return {
          transactions: [txn(`txn-${offset}`, `res-${offset}`)],
          total: 42,
          hasMore: offset + 1 < 42,
          search: params.get('search'),
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    }) as IAdminAuthManager['fetchWithAuth'];

    render(
      <TransactionsSection
        serverUrl="https://api.example.com"
        pageSize={20}
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    expect(await screen.findByText('Showing 1–1 of 42')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page of transactions' }));
    await waitFor(() => expect(offsets).toContain(20));

    // Narrowing the collection must not strand the view on a deep offset.
    fireEvent.click(screen.getByLabelText('Method'));
    fireEvent.click(await screen.findByRole('option', { name: 'Card' }));
    await waitFor(() => expect(offsets[offsets.length - 1]).toBe(0));
  });

  it('builds page slots with ellipsis gaps once there are more than seven pages', () => {
    expect(paginationPages(1, 3)).toEqual([1, 2, 3]);
    expect(paginationPages(1, 10)).toEqual([1, 2, 3, 4, 'gap', 10]);
    expect(paginationPages(6, 10)).toEqual([1, 'gap', 5, 6, 7, 'gap', 10]);
    expect(paginationPages(10, 10)).toEqual([1, 'gap', 7, 8, 9, 10]);
  });
});
