import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AdminShell,
  HOST_SERVICE_IDS,
  type AdminPlugin,
  type AdminSectionProps,
  type HostContext,
} from '@cedros/admin-react';

import { cedrosPayPlugin } from '../../admin/plugin';
import { AdminAuthManager } from '../../components/admin/AdminAuthManager';

function TransactionsProbe({ pluginContext }: AdminSectionProps) {
  const authManager = new AdminAuthManager(pluginContext.serverUrl);
  authManager.setCedrosLoginAuth(
    pluginContext.getAccessToken(),
    pluginContext.hasPermission('cedros-pay:admin')
  );

  return (
    <div
      data-auth-method={authManager.getAuthMethod()}
      data-has-admin={String(pluginContext.hasPermission('cedros-pay:admin'))}
      data-token={pluginContext.getAccessToken() ?? 'none'}
    >
      {pluginContext.serverUrl}
    </div>
  );
}

describe('cedros-pay AdminShell composition', () => {
  it('supports plugin composition with service-bag-only host context', () => {
    const payCompositionPlugin = {
      ...cedrosPayPlugin,
      components: {
        ...cedrosPayPlugin.components,
        transactions: TransactionsProbe,
      },
    } as unknown as AdminPlugin;

    const hostContext: HostContext = {
      services: {
        [HOST_SERVICE_IDS.cedrosLogin]: {
          user: { id: 'user-1', email: 'admin@example.com', name: 'Pay Admin' },
          getAccessToken: () => 'login-token',
          serverUrl: 'https://login.example.com',
        },
        [HOST_SERVICE_IDS.cedrosPay]: {
          serverUrl: 'https://pay.example.com',
          jwtToken: 'pay-token',
          walletAddress: 'wallet-1',
        },
        [HOST_SERVICE_IDS.org]: {
          orgId: 'org-1',
          role: 'owner',
          permissions: ['cedros-pay:admin'],
        },
      },
    };

    const html = renderToStaticMarkup(
      <AdminShell
        plugins={[payCompositionPlugin]}
        hostContext={hostContext}
        defaultSection="cedros-pay:transactions"
      />
    );

    expect(html).toContain('Transactions');
    expect(html).toContain('https://pay.example.com');
    expect(html).toContain('data-auth-method="cedros-login"');
    expect(html).toContain('data-has-admin="true"');
    expect(html).toContain('data-token="login-token"');
  });
});
