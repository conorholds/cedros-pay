import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  HOST_SERVICE_IDS,
  type AdminPlugin,
  type AdminSectionProps,
  type HostContext,
  type QualifiedSectionId,
} from '../../admin/types';

import { cedrosPayPlugin } from '../../admin/plugin';
import { CEDROS_BALANCE_CREDIT_RAIL_CAPABILITIES } from '../../admin/dependencies';
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

function TestAdminShell({
  plugins,
  hostContext,
  defaultSection,
}: {
  plugins: AdminPlugin[];
  hostContext: HostContext;
  defaultSection?: QualifiedSectionId;
}) {
  const plugin = plugins[0];
  if (!plugin) return null;

  const sectionId = defaultSection ?? plugin.sections[0]?.id;
  const section = plugin.sections.find((item) => item.id === sectionId) ?? plugin.sections[0];
  const Component = section ? plugin.components[section.id] : undefined;
  const pluginContext = plugin.createPluginContext(hostContext);

  return (
    <div>
      <nav>{plugin.sections.map((item) => <span key={item.id}>{item.label}</span>)}</nav>
      {Component ? <Component pluginContext={pluginContext} /> : null}
    </div>
  );
}

function buildHostContext(overrides: Partial<HostContext> = {}): HostContext {
  return {
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
    ...overrides,
  };
}

describe('cedros-pay AdminShell composition', () => {
  it('supports plugin composition with service-bag-only host context', () => {
    const payCompositionPlugin = {
      ...cedrosPayPlugin,
      components: {
        ...cedrosPayPlugin.components,
        'cedros-pay:transactions': TransactionsProbe,
      },
    } as unknown as AdminPlugin;

    const hostContext = buildHostContext();

    const html = renderToStaticMarkup(
      <TestAdminShell
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

  it('maps Shop catalog admin tab navigation into pluginData.defaultTabId', () => {
    const context = cedrosPayPlugin.createPluginContext(
      buildHostContext({
        route: {
          moduleId: 'cedros-pay:admin',
          sectionId: 'cedros-pay:catalog',
          tabId: 'cedros-pay:inventory',
        },
      })
    );

    expect(context.pluginData?.defaultTabId).toBe('inventory');
  });

  it('maps Pay hub tab navigation into pluginData.defaultTabId', () => {
    const context = cedrosPayPlugin.createPluginContext(
      buildHostContext({
        route: {
          moduleId: 'cedros-pay:admin',
          sectionId: 'cedros-pay:settings-hub',
          tabId: 'cedros-pay:crypto',
        },
      })
    );

    expect(context.pluginData?.defaultTabId).toBe('crypto');
  });

  it('maps legacy Pay hub payment-settings routes to Stripe', () => {
    const context = cedrosPayPlugin.createPluginContext(
      buildHostContext({
        route: {
          moduleId: 'cedros-pay:admin',
          sectionId: 'cedros-pay:settings-hub',
          tabId: 'cedros-pay:payment-settings',
        },
      })
    );

    expect(context.pluginData?.defaultTabId).toBe('stripe');
  });

  it('passes read-only Cedros Balance dependency state from the balance-read grant', () => {
    const blocked = cedrosPayPlugin.createPluginContext(buildHostContext());
    const installedViaServiceAndGrant = cedrosPayPlugin.createPluginContext(
      buildHostContext({
        services: {
          [HOST_SERVICE_IDS.cedrosBalance]: { installed: true },
          [HOST_SERVICE_IDS.org]: {
            role: 'viewer',
            capabilities: [...CEDROS_BALANCE_CREDIT_RAIL_CAPABILITIES],
          },
        },
      })
    );
    const installedViaCapabilities = cedrosPayPlugin.createPluginContext(
      {
        services: {
          [HOST_SERVICE_IDS.org]: {
            role: 'viewer',
            capabilities: [...CEDROS_BALANCE_CREDIT_RAIL_CAPABILITIES],
          },
        },
      }
    );
    const unrelatedGrant = cedrosPayPlugin.createPluginContext(
      {
        services: {
          [HOST_SERVICE_IDS.org]: {
            role: 'viewer',
            capabilities: ['cedros-login:user-context'],
          },
        },
      }
    );

    expect(blocked.dependencies?.cedrosBalanceInstalled).toBe(false);
    expect(installedViaServiceAndGrant.dependencies?.cedrosBalanceInstalled).toBe(true);
    expect(installedViaCapabilities.dependencies?.cedrosBalanceInstalled).toBe(true);
    expect(unrelatedGrant.dependencies?.cedrosBalanceInstalled).toBe(false);
  });

  it('ignores unknown or mismatched route tab hints', () => {
    const mismatchedSection = cedrosPayPlugin.createPluginContext(
      buildHostContext({
        route: {
          moduleId: 'cedros-pay:admin',
          sectionId: 'cedros-pay:catalog',
          tabId: 'cedros-pay:orders',
        },
      })
    );
    const wrongModule = cedrosPayPlugin.createPluginContext(
      buildHostContext({
        route: {
          moduleId: 'cedros-shop:admin',
          sectionId: 'cedros-pay:catalog',
          tabId: 'cedros-pay:inventory',
        },
      })
    );
    const wrongSection = cedrosPayPlugin.createPluginContext(
      buildHostContext({
        route: {
          moduleId: 'cedros-pay:admin',
          sectionId: 'cedros-shop:catalog',
          tabId: 'cedros-pay:inventory',
        },
      })
    );

    expect(mismatchedSection.pluginData?.defaultTabId).toBeUndefined();
    expect(wrongModule.pluginData?.defaultTabId).toBeUndefined();
    expect(wrongSection.pluginData?.defaultTabId).toBeUndefined();
  });
});
