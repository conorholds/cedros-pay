/**
 * Cedros Pay Admin Plugin
 *
 * Exports the cedrosPayPlugin for use with the unified AdminShell.
 * When used with cedros-login's plugin, provides a combined admin interface.
 */

import { lazy, useEffect, useMemo, type ComponentType, type ReactNode } from 'react';
import {
  HOST_SERVICE_IDS,
  getHostService,
  type AdminRouteHint,
  type AdminPlugin,
  type AdminSectionProps,
  type HostContext,
  type PluginContext,
} from './types';
import type { SectionProps } from '../components/admin/types';
import { AdminAuthManager } from '../components/admin/AdminAuthManager';
import { AdminPluginIcons } from '../components/admin/icons';
import { SettingsHubSection } from '../components/admin/SettingsHubSection';
import { normalizeLocale } from '../i18n/locales';
import {
  CEDROS_PAY_EXTENSION_ID,
  CEDROS_PAY_ADMIN_MODULE_ID,
  CEDROS_PAY_EXTENSION_VERSION,
  CEDROS_PAY_STATUS_CARD_ID,
} from '../extension/constants';
import { CEDROS_SHOP_COMMERCE_ANALYTICS_BRIDGE_RUNTIME } from './commerceAnalyticsBridge';
import { CedrosPayStatusCard } from './dashboardCards';
import { hasCedrosBalanceInstalled } from './dependencies';
import {
  CEDROS_PAY_GROUPS,
  CEDROS_PAY_NAVIGATION_SECTIONS,
  CEDROS_PAY_SECTIONS,
} from './sectionIds';
import { cedrosPayAdminModuleManifest } from '../extension/adminModules';
import { MotionBoundary } from '../motion/MotionBoundary';

const ROUTE_HINT_KEYS = [
  'route',
  'currentRoute',
  'routeState',
  'navigationTarget',
  'adminRoute',
] as const;

function AdminSurfaceRoot({
  children,
  authManager,
}: {
  children: ReactNode;
  authManager: AdminAuthManager;
}) {
  useEffect(
    () => authManager.retainDataEvents?.() ?? (() => undefined),
    [authManager]
  );
  return (
    <MotionBoundary>
      <div className="cedros-pay-admin cedros-data" data-extension-id="cedros-pay">
        {children}
      </div>
    </MotionBoundary>
  );
}

function hasAdminPermission(pluginContext: PluginContext): boolean {
  return (
    pluginContext.hasPermission('cedros-pay:admin') ||
    pluginContext.hasPermission('admin')
  );
}

function createAdminAuthManager(
  pluginContext: PluginContext,
  token: string | null,
  hasVerifiedAdminPermission: boolean
): AdminAuthManager {
  const existing = ADMIN_AUTH_MANAGERS.get(pluginContext);
  const mgr = existing?.serverUrl === pluginContext.serverUrl
    ? existing.manager
    : new AdminAuthManager(pluginContext.serverUrl);
  mgr.setCedrosLoginAuth(token ?? null, hasVerifiedAdminPermission);
  mgr.setHostSessionAuth(hasVerifiedAdminPermission);
  ADMIN_AUTH_MANAGERS.set(pluginContext, { serverUrl: pluginContext.serverUrl, manager: mgr });
  return mgr;
}

const ADMIN_AUTH_MANAGERS = new WeakMap<
  PluginContext,
  { serverUrl: string; manager: AdminAuthManager }
>();

// Lazy-load section components wrapped with AdminSectionProps adapter
const wrapSection = (
  importFn: () => Promise<{ default: ComponentType<SectionProps> }>
): ((props: AdminSectionProps) => ReactNode) => {
  const LazyComponent = lazy(async () => {
    const module = await importFn();
    const OriginalComponent = module.default;

    // Return a wrapper that converts AdminSectionProps to SectionProps
    const WrappedComponent = ({ pluginContext }: AdminSectionProps) => {
      const token = pluginContext.getAccessToken();
      const hasVerifiedAdminPermission = hasAdminPermission(pluginContext);
      const authManager = useMemo(() => {
        return createAdminAuthManager(pluginContext, token, hasVerifiedAdminPermission);
      }, [hasVerifiedAdminPermission, pluginContext, token]);

      // Hosts can hint a default tab for tabbed umbrella sections by writing
      // pluginContext.pluginData.defaultTabId. Non-tabbed sections ignore this prop.
      const defaultTabIdRaw = pluginContext.pluginData?.defaultTabId;
      const defaultTabId =
        typeof defaultTabIdRaw === 'string' && defaultTabIdRaw.length > 0
          ? defaultTabIdRaw
          : undefined;

      const sectionProps: SectionProps = {
        serverUrl: pluginContext.serverUrl,
        locale: pluginContext.locale,
        authManager,
        persistenceScope: deriveAdminPersistenceScope(pluginContext),
        defaultTabId,
        dependencies: pluginContext.dependencies,
      };
      return (
        <AdminSurfaceRoot authManager={authManager}>
          <OriginalComponent {...sectionProps} />
        </AdminSurfaceRoot>
      );
    };

    return { default: WrappedComponent };
  });

  return LazyComponent;
};

export function deriveAdminPersistenceScope(pluginContext: PluginContext): string | undefined {
  if (!pluginContext.orgId || !pluginContext.userId) return undefined;
  const source = JSON.stringify([
    pluginContext.serverUrl,
    pluginContext.orgId ?? '',
    pluginContext.userId ?? '',
  ]);
  return `${hashScope(source, 0x811c9dc5)}${hashScope(source, 0x9e3779b9)}`;
}

function hashScope(source: string, seed: number): string {
  let hash = seed;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const adaptSection = (
  OriginalComponent: ComponentType<SectionProps>
): ((props: AdminSectionProps) => ReactNode) => {
  return ({ pluginContext }: AdminSectionProps) => {
    const token = pluginContext.getAccessToken();
    const hasVerifiedAdminPermission = hasAdminPermission(pluginContext);
    const authManager = useMemo(() => {
      return createAdminAuthManager(pluginContext, token, hasVerifiedAdminPermission);
    }, [hasVerifiedAdminPermission, pluginContext, token]);

    const defaultTabIdRaw = pluginContext.pluginData?.defaultTabId;
    const defaultTabId =
      typeof defaultTabIdRaw === 'string' && defaultTabIdRaw.length > 0
        ? defaultTabIdRaw
        : undefined;

    return (
      <AdminSurfaceRoot authManager={authManager}>
        <OriginalComponent
          serverUrl={pluginContext.serverUrl}
          locale={pluginContext.locale}
          authManager={authManager}
          persistenceScope={deriveAdminPersistenceScope(pluginContext)}
          defaultTabId={defaultTabId}
          dependencies={pluginContext.dependencies}
        />
      </AdminSurfaceRoot>
    );
  };
};

// Umbrella icon mapping - each sidebar entry gets a visually distinct icon.
// Manifest sectionIcons use the host's limited fallback icon vocabulary for
// hosts that render the manifest before loading this React module.
const SECTION_ICONS: Record<string, () => ReactNode> = {
  transactions: AdminPluginIcons.transactions,
  catalog: AdminPluginIcons.catalog,
  'settings-hub': AdminPluginIcons.settings,
};

const CEDROS_PAY_EXTENSION_MOUNT_PATH = '/extensions/cedros-pay';

function normalizeServerUrl(value?: string): string {
  return value?.trim().replace(/\/+$/, '') ?? '';
}

function appendExtensionMount(baseUrl: string): string {
  const normalized = normalizeServerUrl(baseUrl);
  if (!normalized) return '';

  try {
    const url = new URL(normalized);
    const pathname = url.pathname.replace(/\/+$/, '');
    if (pathname.endsWith(CEDROS_PAY_EXTENSION_MOUNT_PATH)) {
      return normalized;
    }
  } catch {
    if (normalized.endsWith(CEDROS_PAY_EXTENSION_MOUNT_PATH)) {
      return normalized;
    }
  }

  return `${normalized}${CEDROS_PAY_EXTENSION_MOUNT_PATH}`;
}

function resolvePayRuntimeBaseUrl(
  payContext: NonNullable<HostContext['cedrosPay']> | undefined,
  loginContext: NonNullable<HostContext['cedrosLogin']> | undefined
): string {
  const explicitRuntimeBase = normalizeServerUrl(
    payContext?.runtimeBaseUrl || payContext?.extensionBaseUrl || payContext?.apiBaseUrl
  );
  if (explicitRuntimeBase) {
    return explicitRuntimeBase;
  }

  const payServerUrl = normalizeServerUrl(payContext?.serverUrl);
  const loginServerUrl = normalizeServerUrl(loginContext?.serverUrl);

  if (payServerUrl && payServerUrl !== loginServerUrl) {
    return payServerUrl;
  }

  if (payServerUrl) {
    return appendExtensionMount(payServerUrl);
  }

  return appendExtensionMount(loginServerUrl);
}

function hasOperatorAdminRole(role?: string): boolean {
  const normalized = role?.trim().toLowerCase();
  return normalized === 'owner' || normalized === 'administrator' || normalized === 'admin';
}

function hasOrgPermissionGrant(
  orgContext: NonNullable<HostContext['org']> | undefined,
  permission: string
): boolean {
  return (
    orgContext?.permissions?.includes(permission) === true ||
    orgContext?.capabilities?.includes(permission) === true
  );
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readRouteHint(record: Record<string, unknown> | undefined): AdminRouteHint | undefined {
  if (!record) return undefined;
  const hint = {
    moduleId: readString(record.moduleId),
    sectionId: readString(record.sectionId),
    tabId: readString(record.tabId),
    defaultTabId: readString(record.defaultTabId),
  };
  return Object.values(hint).some(Boolean) ? hint : undefined;
}

function routeHintCandidates(hostContext: HostContext): AdminRouteHint[] {
  const root = readRecord(hostContext) ?? {};
  const rootHint = readRouteHint(root);
  const candidates: AdminRouteHint[] = [];
  if (rootHint) candidates.push(rootHint);

  for (const key of ROUTE_HINT_KEYS) {
    const nestedHint = readRouteHint(readRecord(root[key]));
    if (nestedHint) candidates.push({ ...rootHint, ...nestedHint });
  }

  const pluginDataHint = readRouteHint(readRecord(root.pluginData));
  if (pluginDataHint) candidates.push({ ...rootHint, ...pluginDataHint });
  return candidates;
}

function localPayId(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const separator = value.indexOf(':');
  if (separator === -1) return value;
  if (value.slice(0, separator) !== CEDROS_PAY_EXTENSION_ID) return undefined;
  return value.slice(separator + 1);
}

function routeHintTargetsPay(hint: AdminRouteHint): boolean {
  return (
    !hint.moduleId ||
    hint.moduleId === CEDROS_PAY_ADMIN_MODULE_ID ||
    hint.moduleId === CEDROS_PAY_EXTENSION_ID
  );
}

function normalizeRouteTabId(sectionId: string | undefined, tabId: string): string {
  return ((!sectionId || sectionId === 'settings-hub') && tabId === 'payment-settings') ? 'stripe' : tabId;
}

function resolveRouteDefaultTabId(hostContext: HostContext): string | undefined {
  for (const hint of routeHintCandidates(hostContext)) {
    if (!routeHintTargetsPay(hint)) continue;
    const sectionId = localPayId(hint.sectionId);
    if (hint.sectionId && !sectionId) continue;
    const rawTabId = localPayId(hint.defaultTabId ?? hint.tabId);
    if (!rawTabId) continue;
    const tabId = normalizeRouteTabId(sectionId, rawTabId);

    const sections = sectionId
      ? CEDROS_PAY_SECTIONS.filter((section) => section.id === sectionId)
      : CEDROS_PAY_SECTIONS;
    if (sections.some((section) => section.tabs.some((tab) => tab.id === tabId))) {
      return tabId;
    }
  }
  return undefined;
}

/**
 * Cedros Pay admin plugin definition.
 *
 * Registers cedros-pay admin sidebar sections for use in the unified AdminShell.
 * Closely related sub-workflows (products/inventory/subscriptions/coupons,
 * transactions/orders/refunds/returns/disputes and payment options)
 * are exposed as tabs inside their umbrella section rather than as separate sidebar pages.
 */
export const cedrosPayPlugin: AdminPlugin = {
  id: CEDROS_PAY_ADMIN_MODULE_ID,
  name: 'Cedros Pay',
  version: CEDROS_PAY_EXTENSION_VERSION,

  // The host resolves a loaded runtime admin module by manifest.extensionId +
  // manifest.moduleId; without this the host shows "Admin bundle not loaded".
  // Shares the single declared admin-module manifest (see ./extension/adminModules).
  manifest: cedrosPayAdminModuleManifest,

  sections: CEDROS_PAY_NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    icon: SECTION_ICONS[section.id.replace('cedros-pay:', '')],
  })),

  groups: CEDROS_PAY_GROUPS.map((group) => ({ ...group })),

  components: {
    'cedros-pay:transactions': wrapSection(() =>
      import('../components/admin/TransactionsHubSection').then((m) => ({ default: m.TransactionsHubSection }))
    ),
    'cedros-pay:catalog': wrapSection(() =>
      import('../components/admin/CatalogSection').then((m) => ({ default: m.CatalogSection }))
    ),
    'cedros-pay:settings-hub': adaptSection(SettingsHubSection),
  },

  contributions: {
    dashboardCards: [
      {
        id: CEDROS_PAY_STATUS_CARD_ID,
        Component: CedrosPayStatusCard,
        order: 20,
      },
    ],
    custom: {
      cedrosShop: {
        commerceAnalytics: CEDROS_SHOP_COMMERCE_ANALYTICS_BRIDGE_RUNTIME,
      },
    },
  },

  createPluginContext(hostContext: HostContext): PluginContext {
    const payContext = getHostService<NonNullable<HostContext['cedrosPay']>>(
      hostContext,
      HOST_SERVICE_IDS.cedrosPay
    );
    const loginContext = getHostService<NonNullable<HostContext['cedrosLogin']>>(
      hostContext,
      HOST_SERVICE_IDS.cedrosLogin
    );
    const orgContext = getHostService<NonNullable<HostContext['org']>>(hostContext, HOST_SERVICE_IDS.org);

    // Admin auth is owned by Cedros Login. Without it, admin calls fail closed.
    // In an installed Cedros Data host, Pay APIs are mounted below the host
    // runtime origin instead of at root `/admin/*`.
    const serverUrl = resolvePayRuntimeBaseUrl(payContext, loginContext);
    const locale = payContext?.locale || loginContext?.locale || hostContext.locale;
    const defaultTabId = resolveRouteDefaultTabId(hostContext);

    return {
      serverUrl,
      locale: locale ? normalizeLocale(locale) : undefined,
      userId: loginContext?.user?.id,
      getAccessToken: () => loginContext?.getAccessToken?.() ?? null,
      hasPermission: (permission: string) => this.checkPermission?.(permission, hostContext) ?? false,
      orgId: orgContext?.orgId,
      dependencies: {
        cedrosBalanceInstalled: hasCedrosBalanceInstalled(hostContext),
      },
      pluginData: {
        walletAddress: payContext?.walletAddress,
        ...(defaultTabId ? { defaultTabId } : {}),
      },
    };
  },

  checkPermission(permission: string, hostContext: HostContext): boolean {
    const orgContext = getHostService<NonNullable<HostContext['org']>>(hostContext, HOST_SERVICE_IDS.org);
    if (hasOperatorAdminRole(orgContext?.role)) {
      return true;
    }
    return hasOrgPermissionGrant(orgContext, permission);
  },

  cssNamespace: 'cedros-dashboard',
};

export default cedrosPayPlugin;
