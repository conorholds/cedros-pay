import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CouponsSection } from '../../components/admin/CouponsSection';
import type {
  AdminAuthHeaders,
  IAdminAuthManager,
} from '../../components/admin/AdminAuthManager';
import type { Coupon } from '../../components/admin/types';

class FakeAuthManager implements IAdminAuthManager {
  constructor(private readonly coupons: Coupon[]) {}

  getAuthMethod() {
    return 'cedros-login' as const;
  }

  isAuthenticated() {
    return true;
  }

  setCedrosLoginAuth(_token: string | null, _isAdmin?: boolean) {}

  async createAuthHeaders(): Promise<AdminAuthHeaders> {
    return { Authorization: 'Bearer test' };
  }

  async fetchWithAuth<T>(_path: string, _options?: RequestInit): Promise<T> {
    return { coupons: this.coupons } as T;
  }
}

const SECTION_PROPS = { serverUrl: 'https://example.test' };

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

function codeOrder(): string[] {
  const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
  return rows.map((row) => within(row).getAllByRole('cell')[0].textContent ?? '');
}

describe('CouponsSection styling', () => {
  it('renders the EmptyState when there are no coupons', async () => {
    render(<CouponsSection {...SECTION_PROPS} authManager={new FakeAuthManager([])} />);

    await waitFor(() => {
      expect(screen.getByText('No coupons yet')).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        'Create a discount coupon to run promotions and reward customers at checkout.'
      )
    ).toBeInTheDocument();
    expect(document.querySelector('.cedros-data-empty-state__art')).not.toBeNull();
    expect(document.querySelector('.cedros-data-empty-state__art-accent')).not.toBeNull();
  });

  it('opens coupon creation in a focused dialog instead of expanding the page', async () => {
    render(<CouponsSection {...SECTION_PROPS} authManager={new FakeAuthManager([])} />);

    expect(await screen.findByText('No coupons yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add coupon' }));

    const dialog = screen.getByRole('dialog', { name: 'Add coupon' });
    expect(within(dialog).getByLabelText('Close add coupon dialog')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create coupon' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Discount value (%)')).toHaveAttribute('max', '100');
    expect(screen.getByText('No coupons yet')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('guards and clears a dirty coupon draft before closing', async () => {
    render(<CouponsSection {...SECTION_PROPS} authManager={new FakeAuthManager([])} />);

    expect(await screen.findByText('No coupons yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add coupon' }));
    fireEvent.change(screen.getByLabelText('Coupon code'), { target: { value: 'SAVE20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('dialog', { name: 'Discard coupon?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Coupon code')).toHaveValue('SAVE20');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add coupon' }));
    expect(screen.getByLabelText('Coupon code')).toHaveValue('');
  });

  it('keeps the modal open while creating and shows submit failures inside it', async () => {
    let finishCreate: (() => void) | undefined;
    let rejectCreate: ((error: Error) => void) | undefined;
    const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
      if (path === '/admin/coupons' && options?.method === 'POST') {
        return new Promise((resolve, reject) => {
          finishCreate = () => resolve(undefined);
          rejectCreate = reject;
        });
      }
      return { coupons: [] };
    }) as IAdminAuthManager['fetchWithAuth'];
    render(
      <CouponsSection
        {...SECTION_PROPS}
        authManager={buildAuthManager(fetchWithAuth)}
      />
    );

    expect(await screen.findByText('No coupons yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add coupon' }));
    fireEvent.change(screen.getByLabelText('Coupon code'), { target: { value: 'SAVE20' } });
    fireEvent.change(screen.getByLabelText('Discount value (%)'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create coupon' }));
    await waitFor(() => expect(finishCreate).toBeDefined());

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Add coupon' })).toBeInTheDocument();

    await act(async () => rejectCreate?.(new Error('offline')));
    expect(
      within(screen.getByRole('dialog')).getByText('Failed to create coupon')
    ).toBeInTheDocument();
  });

  it('defaults to newest-expiry-first and a Code sort toggle reorders rows', async () => {
    const coupons: Coupon[] = [
      { code: 'BBB', discountType: 'percentage', discountValue: 10, active: true, usageCount: 0, expiresAt: '2026-12-01T00:00:00Z' },
      { code: 'AAA', discountType: 'percentage', discountValue: 20, active: true, usageCount: 0, expiresAt: '2026-01-01T00:00:00Z' },
    ];

    render(<CouponsSection {...SECTION_PROPS} authManager={new FakeAuthManager(coupons)} />);

    // Default sort is by Expires desc -> BBB (Dec) before AAA (Jan).
    await waitFor(() => {
      expect(codeOrder()).toEqual(['BBB', 'AAA']);
    });

    // Sorting by Code ascending reorders to AAA, BBB. This differs from the
    // default order, so it genuinely exercises the Code sort.
    fireEvent.click(screen.getByRole('button', { name: /Code/i }));
    expect(codeOrder()).toEqual(['AAA', 'BBB']);

    // Toggling Code again flips to descending -> BBB, AAA.
    fireEvent.click(screen.getByRole('button', { name: /Code/i }));
    expect(codeOrder()).toEqual(['BBB', 'AAA']);
  });
});
