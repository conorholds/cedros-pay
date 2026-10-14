import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CouponsSection } from '../../components/admin/CouponsSection';
import type {
  AdminAuthHeaders,
  IAdminAuthManager,
} from '../../components/admin/AdminAuthManager';

class FakeAuthManager implements IAdminAuthManager {
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
    return { coupons: [] } as T;
  }
}

describe('CouponsSection unsupported-option guidance', () => {
  it('warns when the operator sets an option checkout will reject', async () => {
    render(
      <CouponsSection serverUrl="https://example.test" authManager={new FakeAuthManager()} />
    );
    await waitFor(() => {
      expect(screen.getByText('No coupons yet')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add coupon/i }));
    // No warning while the form only uses supported options.
    expect(screen.queryByText(/Not yet applied at checkout/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Advanced options'));
    // First matching input is the usage-limit field (the second is per-customer).
    fireEvent.change(screen.getAllByPlaceholderText('Leave empty for unlimited')[0], {
      target: { value: '5' },
    });

    expect(screen.getByText(/Not yet applied at checkout/)).toBeInTheDocument();
    expect(screen.getByText(/usage limits/)).toBeInTheDocument();
  });
});
