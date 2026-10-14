import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IAdminAuthManager } from '../../components/admin/AdminAuthManager';
import { RegionalPaymentMethodsSection } from '../../components/admin/RegionalPaymentMethodsSection';

function config(category: string, values: Record<string, unknown>) {
  return {
    category,
    config: values,
    updatedAt: '',
    committedRevision: null,
    secretsRedacted: true,
  };
}

function setupAuth(
  shopValues: Record<string, unknown> = { regional_payment_policy: null }
) {
  const fetchWithAuth = vi.fn(async (path: string, options?: RequestInit) => {
    if (path === '/admin/config/shop') return config('shop', shopValues);
    if (path === '/admin/config/stripe') {
      return config('stripe', {
        enabled: true,
        publishable_key: 'pk_test_ready',
        secret_key: '[REDACTED]',
      });
    }
    if (path === '/admin/config/x402') {
      return config('x402', {
        enabled: true,
        payment_address: 'pay-address',
        token_mint: 'token-mint',
        rpc_url: 'https://rpc.example.test',
      });
    }
    if (path === '/admin/config/cedros_login') {
      return config('cedros_login', { credits_enabled: false });
    }
    if (path === '/admin/config/validate') return { valid: true, errors: [], warnings: [] };
    if (path === '/admin/config/shop' && options?.method === 'PATCH') {
      return {
        category: 'shop',
        updated: true,
        updatedAt: '2026-07-16T00:00:00Z',
        committedRevision: 'revision-1',
        message: 'updated',
      };
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  const authManager = {
    isAuthenticated: () => true,
    fetchWithAuth,
  } as unknown as IAdminAuthManager;
  return { authManager, fetchWithAuth };
}

describe('RegionalPaymentMethodsSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies and saves the US + EU cards preset with a stablecoin fallback', async () => {
    const { authManager, fetchWithAuth } = setupAuth();
    render(
      <RegionalPaymentMethodsSection
        serverUrl="https://example.test"
        authManager={authManager}
      />
    );

    await screen.findByRole('button', { name: 'Apply US + EU cards preset' });
    fireEvent.click(screen.getByRole('button', { name: 'Apply US + EU cards preset' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Market country' }), {
      target: { value: 'JP' },
    });
    expect(screen.getByText(/Japan: Stablecoin/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }));

    await screen.findByText('Regional payment availability saved.');
    const patchCall = fetchWithAuth.mock.calls.find(
      ([path, options]) => path === '/admin/config/shop' && options?.method === 'PATCH'
    );
    expect(patchCall).toBeDefined();
    const body = JSON.parse(String(patchCall?.[1]?.body));
    expect(body.updates.regional_payment_policy).toMatchObject({
      enabled: true,
      fallbackMethods: ['x402'],
      rules: [{ methods: ['stripe', 'x402'] }],
    });
    expect(body.updates.regional_payment_policy.rules[0].countries).toContain('US');
    expect(body.updates.regional_payment_policy.rules[0].countries).toContain('DE');
  });

  it('allows an empty fallback to disable checkout everywhere else', async () => {
    const { authManager, fetchWithAuth } = setupAuth();
    render(
      <RegionalPaymentMethodsSection
        serverUrl="https://example.test"
        authManager={authManager}
      />
    );

    await screen.findByRole('switch', { name: 'Enable regional payment availability' });
    fireEvent.click(screen.getByRole('switch', { name: 'Enable regional payment availability' }));
    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Save availability' }));

    await screen.findByText('Regional payment availability saved.');
    const patchCall = fetchWithAuth.mock.calls.find(
      ([path, options]) => path === '/admin/config/shop' && options?.method === 'PATCH'
    );
    const body = JSON.parse(String(patchCall?.[1]?.body));
    expect(body.updates.regional_payment_policy.fallbackMethods).toEqual([]);
  });

  it('surfaces malformed stored policy without allowing an overwrite', async () => {
    const { authManager } = setupAuth({ regional_payment_policy: { schemaVersion: 2 } });
    render(
      <RegionalPaymentMethodsSection serverUrl="https://example.test" authManager={authManager} />
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Stored regional payment availability is invalid.'
    );
    expect(screen.getByRole('button', { name: 'Save availability' })).toBeDisabled();
  });

  it('does not preview a policy-selected rail that is not executable', async () => {
    const { authManager } = setupAuth({
      payment_availability_snapshot: {
        paymentMethods: {
          stripe: { available: false },
          x402: { available: true },
          credits: { available: false },
        },
      },
      regional_payment_policy: {
        schemaVersion: 1,
        enabled: true,
        fallbackMethods: ['stripe'],
        rules: [],
      },
    });
    render(
      <RegionalPaymentMethodsSection serverUrl="https://example.test" authManager={authManager} />
    );

    expect(await screen.findByText(/United States: No payment methods available/))
      .toBeInTheDocument();
  });
});
