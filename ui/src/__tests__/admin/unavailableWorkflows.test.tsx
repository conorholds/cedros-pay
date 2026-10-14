import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';
import { DisputesSection } from '../../components/admin/DisputesSection';

function unavailableAuthManager(): IAdminAuthManager {
  const fetchWithAuth = vi.fn(async () => {
    throw new Error('501 not_implemented');
  }) as IAdminAuthManager['fetchWithAuth'];

  return {
    getAuthMethod: () => 'cedros-login',
    isAuthenticated: () => true,
    setCedrosLoginAuth: () => {},
    createAuthHeaders: async () => ({ Authorization: 'Bearer token' }),
    fetchWithAuth,
  };
}

describe('unavailable admin workflows', () => {
  it('renders a first-load disputes failure instead of a truthful-looking empty state', async () => {
    render(
      <DisputesSection
        serverUrl="https://api.example.test"
        authManager={unavailableAuthManager()}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load disputes');
    expect(screen.queryByText('No disputes yet')).not.toBeInTheDocument();
  });
});
