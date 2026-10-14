/**
 * Integration test: verifies Settings Hub renders the single remaining
 * payment settings page directly. Hosts may still pass stale defaultTabId
 * runtime context outside the manifest schema, and it should be harmless.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import { Suspense, type ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../components/admin/PaymentSettingsSection', () => ({
  PaymentSettingsSection: ({
    authManager,
  }: {
    authManager?: { getAuthMethod: () => string };
  }) => (
    <div
      data-testid="payment-settings-section"
      data-auth-method={authManager?.getAuthMethod() ?? 'none'}
    >
      payment
    </div>
  ),
}));

import { cedrosPayPlugin } from '../../admin/plugin';
import type { AdminSectionProps } from '../../admin/types';

const SettingsHub = cedrosPayPlugin.components['cedros-pay:settings-hub'];

function buildPluginContext(
  defaultTabId?: string,
  options: { token?: string | null; hasPermission?: boolean } = {}
): AdminSectionProps['pluginContext'] {
  return {
    serverUrl: 'https://example.test',
    getAccessToken: () => options.token === undefined ? 'token-1' : options.token,
    hasPermission: () => options.hasPermission ?? true,
    pluginData: defaultTabId ? { defaultTabId } : undefined,
  };
}

async function renderSettingsHub(
  defaultTabId?: string,
  options?: { token?: string | null; hasPermission?: boolean }
) {
  const Component = SettingsHub as ComponentType<AdminSectionProps>;
  const ui = (
    <Suspense fallback={<div data-testid="loading">loading…</div>}>
      <Component pluginContext={buildPluginContext(defaultTabId, options)} />
    </Suspense>
  );

  let utils: ReturnType<typeof render>;
  await act(async () => {
    utils = render(ui);
  });
  // wait for lazy chunk + adapter to commit
  await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
  return utils!;
}

describe('settings hub direct rendering', () => {
  it('renders payment settings without a redundant top-level tab', async () => {
    await renderSettingsHub();
    expect(await screen.findByTestId('payment-settings-section')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Payment Options' })).not.toBeInTheDocument();
  });

  it('uses host-session admin auth when the host has admin permission but no bearer token', async () => {
    await renderSettingsHub(undefined, { token: null });

    expect(await screen.findByTestId('payment-settings-section')).toHaveAttribute(
      'data-auth-method',
      'host-session'
    );
  });

  it('falls back when pluginContext supplies the removed defaultTabId=webhooks', async () => {
    await renderSettingsHub('webhooks');
    expect(await screen.findByTestId('payment-settings-section')).toBeInTheDocument();
  });

  it('falls back when pluginContext supplies the removed defaultTabId=messaging', async () => {
    await renderSettingsHub('messaging');
    expect(await screen.findByTestId('payment-settings-section')).toBeInTheDocument();
  });

  it('falls back to the first tab when defaultTabId does not match a tab', async () => {
    await renderSettingsHub('nonexistent-tab');
    expect(await screen.findByTestId('payment-settings-section')).toBeInTheDocument();
  });
});
