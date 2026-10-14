import { describe, expect, it } from 'vitest';
import { cedrosPayPlugin } from '../../admin/plugin';
import {
  CEDROS_PAY_SECTION_IDS,
  CEDROS_PAY_NAVIGATION_SECTIONS,
  CEDROS_PAY_SECTIONS,
  CEDROS_PAY_SUBSECTIONS,
} from '../../admin/sectionIds';

describe('admin sections', () => {
  it('keeps section metadata and plugin components in sync', () => {
    const sectionIds = CEDROS_PAY_SECTIONS.map((section) => section.qualifiedId).sort();
    const pluginSectionIds = cedrosPayPlugin.sections.map((section) => section.id).sort();
    const componentIds = Object.keys(cedrosPayPlugin.components).sort();

    expect(pluginSectionIds).toEqual(sectionIds);
    expect(componentIds).toEqual(sectionIds);
  });

  it('keeps Data-owned CRM surfaces out while owning content monetization controls', async () => {
    const registerModule = await import('../../admin/register');
    const bootstrap = registerModule.default();
    const forbiddenSectionIds = ['paywall', 'tipping', 'customers'];
    const forbiddenQualifiedIds = forbiddenSectionIds.map((id) => `cedros-pay:${id}`);
    const runtimeSectionIds = cedrosPayPlugin.sections.map((section) => section.id);
    const runtimeComponentIds = Object.keys(cedrosPayPlugin.components);
    const declaredSubsectionIds = CEDROS_PAY_SUBSECTIONS.map((section) => section.id);
    const declaredQualifiedIds = [
      ...CEDROS_PAY_SECTION_IDS,
      ...CEDROS_PAY_SUBSECTIONS.map((section) => section.qualifiedId),
      ...(bootstrap.manifest.adminModules?.flatMap((module) => module.sectionIds ?? []) ?? []),
    ];
    const declaredEndpointText = CEDROS_PAY_SUBSECTIONS
      .flatMap((section) => section.endpoints)
      .join('\n');

    expect(runtimeSectionIds).not.toEqual(expect.arrayContaining(forbiddenSectionIds));
    expect(runtimeComponentIds).not.toEqual(expect.arrayContaining(forbiddenSectionIds));
    expect(runtimeSectionIds).not.toContain('content');
    expect(runtimeComponentIds).not.toContain('content');
    expect(declaredSubsectionIds).not.toEqual(expect.arrayContaining(forbiddenSectionIds));
    expect(declaredSubsectionIds).toContain('content');
    expect(declaredQualifiedIds).not.toEqual(expect.arrayContaining(forbiddenQualifiedIds));
    expect(declaredQualifiedIds).toContain('cedros-pay:content');
    expect(declaredEndpointText).not.toMatch(/\/admin\/customers/iu);
    expect(declaredEndpointText).not.toMatch(/cedrosPayInstalled|\/site\/config\/(?:monetization|tipping)/iu);
  });

  it('publishes admin subsection endpoint metadata for mounted routes', () => {
    const endpointsBySubsection = Object.fromEntries(
      CEDROS_PAY_SUBSECTIONS.map((subsection) => [subsection.id, subsection.endpoints])
    );

    expect(endpointsBySubsection.products).toEqual([
      'GET /admin/catalog/readiness',
      'GET /admin/catalog/exports/{channel}',
      'GET /admin/catalog/exports/{channel}/validate',
      'GET /admin/products',
      'POST /admin/products',
      'GET /admin/products/{id}',
      'PUT /admin/products/{id}',
      'DELETE /admin/products/{id}',
      'GET /admin/products/stripe-import-preview',
      'POST /admin/products/import-stripe',
      'POST /admin/products/{id}/sync-stripe',
    ]);
    expect(endpointsBySubsection.inventory).toEqual([
      'PUT /admin/products/{id}/inventory',
      'POST /admin/products/{id}/inventory/adjust',
      'GET /admin/products/{id}/inventory/adjustments',
      'PUT /admin/products/{id}/variants/inventory',
    ]);
    expect(endpointsBySubsection.subscriptions).toEqual([
      'GET /admin/subscriptions/settings',
      'PUT /admin/subscriptions/settings',
    ]);
    expect(endpointsBySubsection.overview).toEqual([
      'GET /admin/subscriptions/settings',
      'PUT /admin/subscriptions/settings',
      'GET /admin/config/shop',
      'PATCH /admin/config/shop',
      'PATCH /admin/config/subscriptions',
    ]);
    expect(endpointsBySubsection.availability).toEqual([
      'GET /admin/config/shop',
      'POST /admin/config/validate',
      'PATCH /admin/config/shop',
    ]);
    expect(endpointsBySubsection.integrations).toBeUndefined();
    expect(endpointsBySubsection.stripe).toEqual([
      'GET /admin/config/stripe',
      'PUT /admin/config/stripe',
    ]);
    expect(endpointsBySubsection.crypto).toEqual([
      'GET /admin/config/x402',
      'PUT /admin/config/x402',
    ]);
    expect(endpointsBySubsection.credits).toEqual([
      'GET /admin/config/cedros_login',
      'PUT /admin/config/cedros_login',
    ]);
    expect(endpointsBySubsection.app_stores).toEqual([
      'GET /admin/config/native_store',
      'PUT /admin/config/native_store',
    ]);
    expect(endpointsBySubsection.refunds).toEqual([
      'GET /admin/refunds',
      'GET /admin/credits/refund-requests',
      'GET /admin/stripe/refunds',
      'POST /admin/refunds/{id}/deny',
    ]);
    expect(endpointsBySubsection.transactions).toEqual([
      'GET /admin/transactions',
      'POST /admin/stripe/refunds/{id}/process',
    ]);
    expect(endpointsBySubsection.images).toBeUndefined();
    expect(endpointsBySubsection.disputes).toContain('POST /admin/disputes/{id}/status');
    expect(endpointsBySubsection.returns).toContain('POST /admin/returns/{id}/status');
  });

  it('exposes umbrella tab metadata that matches CEDROS_PAY_SUBSECTIONS', () => {
    const tabsBySection = Object.fromEntries(
      CEDROS_PAY_SECTIONS.map((section) => [section.id, section.tabs.map((tab) => tab.id)])
    );

    expect(tabsBySection.catalog).toEqual([
      'products',
      'inventory',
      'subscriptions',
      'coupons',
    ]);
    expect(tabsBySection.transactions).toEqual([
      'transactions',
      'orders',
      'refunds',
      'returns',
      'disputes',
    ]);
    expect(tabsBySection.content).toBeUndefined();
    expect(tabsBySection['settings-hub']).toEqual([
      'overview',
      'availability',
      'stripe',
      'crypto',
      'credits',
      'content',
      'app_stores',
    ]);

    for (const section of CEDROS_PAY_SECTIONS) {
      for (const tab of section.tabs) {
        const subsection = CEDROS_PAY_SUBSECTIONS.find(
          (entry) => entry.id === tab.id && entry.parentId === section.id
        );
        expect(subsection).toBeDefined();
        expect(tab.label).toBe(subsection?.label);
        expect(tab.qualifiedId).toBe(subsection?.qualifiedId);
      }
    }
  });

  it('declares sectionIcons keys that exactly cover sectionIds', async () => {
    const registerModule = await import('../../admin/register');
    const bootstrap = registerModule.default();
    const module = bootstrap.manifest.adminModules?.[0];
    expect(module).toBeDefined();
    const iconKeys = Object.keys(module?.sectionIcons ?? {}).sort();
    const sectionIds = [...(module?.sectionIds ?? [])].sort();
    expect(iconKeys).toEqual(sectionIds);
    const hostIcons = new Set(['account', 'analytics', 'email', 'extensions', 'history', 'providers', 'security', 'team']);
    for (const value of Object.values(module?.sectionIcons ?? {})) {
      expect(typeof value).toBe('string');
      expect(hostIcons.has(value)).toBe(true);
    }
  });

  it('keeps the manifest navigation projection exactly aligned with runtime sections and groups', async () => {
    const registerModule = await import('../../admin/register');
    const module = registerModule.default().manifest.adminModules?.[0];
    const runtimeSections = cedrosPayPlugin.sections.map(({ icon: _icon, ...section }) => section);

    expect(module?.navigation?.sections).toEqual(CEDROS_PAY_NAVIGATION_SECTIONS);
    expect(module?.navigation?.sections).toEqual(runtimeSections);
    expect(module?.navigation?.groups).toEqual(cedrosPayPlugin.groups);
    expect(module?.navigation?.sections.map((section) => section.id).sort()).toEqual(
      [...(module?.sectionIds ?? [])].sort()
    );
  });

  it('uses extension-owned settings grouping and fail-closed section gates', () => {
    const hostSettingsSections = cedrosPayPlugin.sections.filter((section) => section.group === 'Settings');
    const extensionSettingsSections = cedrosPayPlugin.sections.filter(
      (section) => section.group === 'Extension Settings'
    );
    const monetizationSections = cedrosPayPlugin.sections.filter((section) => section.group === 'Monetization');

    expect(cedrosPayPlugin.groups?.map((group) => group.id)).toEqual([
      'Monetization',
      'Extension Settings',
    ]);
    expect(hostSettingsSections).toEqual([]);
    expect(extensionSettingsSections).toEqual([
      expect.objectContaining({
        id: 'cedros-pay:settings-hub',
        label: 'Pay hub',
      }),
    ]);
    expect(monetizationSections.map((section) => section.id)).toEqual([
      'cedros-pay:catalog',
      'cedros-pay:transactions',
    ]);
    expect(cedrosPayPlugin.sections.every((section) => section.requiredPermission === 'cedros-pay:admin')).toBe(true);
    expect(cedrosPayPlugin.sections.every((section) => section.requiredExtensionId === undefined)).toBe(true);
  });

  it('shows Pay admin sections to operator admin roles without explicit extension grants', () => {
    for (const role of ['owner', 'administrator', 'admin']) {
      expect(
        cedrosPayPlugin.checkPermission?.('cedros-pay:admin', {
          org: { orgId: 'org-1', role, permissions: [] },
        })
      ).toBe(true);
    }
  });

  it('keeps Pay admin sections hidden from non-admin roles without an explicit grant', () => {
    expect(
      cedrosPayPlugin.checkPermission?.('cedros-pay:admin', {
        org: { orgId: 'org-1', role: 'viewer', permissions: [] },
      })
    ).toBe(false);
    expect(
      cedrosPayPlugin.checkPermission?.('cedros-pay:admin', {
        org: { orgId: 'org-1', role: 'viewer', permissions: ['cedros-pay:admin'] },
      })
    ).toBe(true);
    expect(
      cedrosPayPlugin.checkPermission?.('cedros-pay:admin', {
        org: { orgId: 'org-1', role: 'viewer', permissions: [], capabilities: ['cedros-pay:admin'] },
      })
    ).toBe(true);
  });

  it('fails closed when Cedros Login auth context is absent', () => {
    const pluginContext = cedrosPayPlugin.createPluginContext({
      cedrosPay: {
        serverUrl: 'https://pay.example.com',
        jwtToken: 'private-pay-token',
      },
    });

    expect(pluginContext.serverUrl).toBe('https://pay.example.com');
    expect(pluginContext.getAccessToken()).toBeNull();
    expect(pluginContext.userId).toBeUndefined();
  });

  it('mounts Pay admin APIs under the host extension runtime when only Login server is present', () => {
    const pluginContext = cedrosPayPlugin.createPluginContext({
      cedrosLogin: {
        serverUrl: 'https://data.example.com',
        getAccessToken: () => 'login-token',
      },
      org: {
        role: 'owner',
      },
    });

    expect(pluginContext.serverUrl).toBe('https://data.example.com/extensions/cedros-pay');
  });

  it('mounts Pay admin APIs under the host extension runtime when Pay shares the Login origin', () => {
    const pluginContext = cedrosPayPlugin.createPluginContext({
      cedrosPay: {
        serverUrl: 'https://data.example.com/',
      },
      cedrosLogin: {
        serverUrl: 'https://data.example.com',
        getAccessToken: () => 'login-token',
      },
      org: {
        role: 'owner',
      },
    });

    expect(pluginContext.serverUrl).toBe('https://data.example.com/extensions/cedros-pay');
  });

  it('preserves explicit Pay runtime base URLs from the host context', () => {
    const pluginContext = cedrosPayPlugin.createPluginContext({
      cedrosPay: {
        serverUrl: 'https://data.example.com',
        runtimeBaseUrl: 'https://data.example.com/extensions/cedros-pay/',
      },
      cedrosLogin: {
        serverUrl: 'https://data.example.com',
        getAccessToken: () => 'login-token',
      },
    });

    expect(pluginContext.serverUrl).toBe('https://data.example.com/extensions/cedros-pay');
  });

  it('reads the latest Cedros Login token from the host service', () => {
    let token: string | null = null;
    const pluginContext = cedrosPayPlugin.createPluginContext({
      cedrosLogin: {
        serverUrl: 'https://data.example.com',
        getAccessToken: () => token,
      },
      org: {
        role: 'owner',
      },
    });

    expect(pluginContext.getAccessToken()).toBeNull();
    token = 'login-token-2';
    expect(pluginContext.getAccessToken()).toBe('login-token-2');
  });
});
