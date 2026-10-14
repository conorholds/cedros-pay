import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RefundsSection } from '../../components/admin/RefundsSection';
import type {
  AdminAuthHeaders,
  IAdminAuthManager,
} from '../../components/admin/AdminAuthManager';
import type { StripeRefund } from '../../components/admin/types';

/** Auth manager that returns canned refund payloads keyed by request path. */
class FakeAuthManager implements IAdminAuthManager {
  constructor(private readonly stripeRefunds: StripeRefund[] = []) {}

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

  async fetchWithAuth<T>(path: string): Promise<T> {
    if (path.startsWith('/admin/config/stripe')) {
      return { category: 'stripe', config: { enabled: true }, updatedAt: '', secretsRedacted: true } as T;
    }
    if (path.startsWith('/admin/config/cedros_login')) {
      return {
        category: 'cedros_login',
        config: { enabled: true, credits_enabled: true },
        updatedAt: '',
        secretsRedacted: true,
      } as T;
    }
    if (path.startsWith('/admin/config/x402')) {
      return { category: 'x402', config: { enabled: true }, updatedAt: '', secretsRedacted: true } as T;
    }
    if (path.startsWith('/admin/stripe/refunds')) {
      return { refunds: this.stripeRefunds } as T;
    }
    if (path.startsWith('/admin/credits/refund-requests')) {
      return { refunds: [] } as T;
    }
    if (path.startsWith('/admin/refunds')) {
      return { refunds: [] } as T;
    }
    throw new Error(`Unexpected path: ${path}`);
  }
}

function stripeRefund(id: string, amount: number, createdAt: string): StripeRefund {
  return {
    id,
    stripeRefundId: `re_${id}`,
    chargeId: `ch_${id}`,
    amount,
    currency: 'usd',
    status: 'succeeded',
    reason: 'requested_by_customer',
    createdAt,
  };
}

describe('RefundsSection styling', () => {
  it('renders empty refund audit tables for enabled methods', async () => {
    const authManager = new FakeAuthManager([]);
    render(<RefundsSection serverUrl="https://example.test" authManager={authManager} />);

    expect(await screen.findByText('No Stripe refunds')).toBeInTheDocument();
    expect(screen.getByText('No credits refunds')).toBeInTheDocument();
    expect(screen.getByText('No x402 refund requests')).toBeInTheDocument();
    expect(document.querySelector('.cedros-data-setup-notice')).not.toBeInTheDocument();
  });

  it('renders provider refund outcomes without offering a second process action', async () => {
    const authManager = new FakeAuthManager([
      stripeRefund('low', 100, '2026-01-01T00:00:00Z'),
      stripeRefund('high', 900, '2026-02-01T00:00:00Z'),
    ]);
    render(<RefundsSection serverUrl="https://example.test" authManager={authManager} />);

    expect(await screen.findByText('re_low')).toBeInTheDocument();
    expect(screen.getByText('re_high')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Process' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('table')).toHaveLength(3);
  });
});
