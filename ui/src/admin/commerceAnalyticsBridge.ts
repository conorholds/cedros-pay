import { AdminAuthManager } from '../components/admin/AdminAuthManager';
import { fetchAdminJson } from '../components/admin/authFetch';
import type { PluginContext } from './types';

export const CEDROS_SHOP_COMMERCE_ANALYTICS_BRIDGE_ID =
  'custom.cedrosShop.commerceAnalytics';

export interface CommerceAnalyticsBridgeOptions {
  /** Maximum number of records to request from Pay; the server clamps bounds. */
  limit?: number;
}

export interface RecoverCheckoutRequest {
  /** Pay checkout/cart quote ID for an eligible abandoned checkout. */
  checkoutId: string;
}

/** Redacted Pay-owned analytics payload for Shop admin rendering. */
export interface CommerceAnalyticsSnapshot {
  generatedAt: string;
  abandonedCheckouts: Array<Record<string, unknown>>;
  paymentEvents: Array<Record<string, unknown>>;
}

/** Host bridge methods exposed under custom.cedrosShop.commerceAnalytics. */
export interface CommerceAnalyticsBridge {
  bridgeId: typeof CEDROS_SHOP_COMMERCE_ANALYTICS_BRIDGE_ID;
  version: 1;
  getSnapshot(options?: CommerceAnalyticsBridgeOptions): Promise<CommerceAnalyticsSnapshot>;
  listAbandonedCheckouts(options?: CommerceAnalyticsBridgeOptions): Promise<Array<Record<string, unknown>>>;
  listPaymentEvents(options?: CommerceAnalyticsBridgeOptions): Promise<Array<Record<string, unknown>>>;
  recoverCheckout(request: RecoverCheckoutRequest): Promise<Record<string, unknown>>;
}

export interface CommerceAnalyticsBridgeFactoryContext {
  /** Cedros Pay plugin context supplied by the AdminShell host. */
  pluginContext: PluginContext;
}

export const CEDROS_SHOP_COMMERCE_ANALYTICS_BRIDGE_MANIFEST = {
  bridgeId: CEDROS_SHOP_COMMERCE_ANALYTICS_BRIDGE_ID,
  version: 1,
  methods: [
    'getSnapshot',
    'listAbandonedCheckouts',
    'listPaymentEvents',
    'recoverCheckout',
  ],
  endpoints: {
    snapshotPath: '/admin/commerce-analytics',
    recoverPathTemplate:
      '/admin/commerce-analytics/abandoned-checkouts/{checkoutId}/recover',
  },
  data: {
    abandonedCheckouts: true,
    paymentEvents: true,
    recoveryTokens: false,
    providerPayloads: false,
  },
} as const;

export const CEDROS_SHOP_COMMERCE_ANALYTICS_BRIDGE_RUNTIME = {
  ...CEDROS_SHOP_COMMERCE_ANALYTICS_BRIDGE_MANIFEST,
  createBridge: createCedrosShopCommerceAnalyticsBridge,
};

/**
 * Build the Shop commerce analytics bridge using Pay admin auth.
 *
 * Throws when Pay admin auth is unavailable or recoverCheckout receives an
 * empty checkoutId. Server responses are already redacted for Shop rendering.
 */
export function createCedrosShopCommerceAnalyticsBridge(
  context: CommerceAnalyticsBridgeFactoryContext | PluginContext
): CommerceAnalyticsBridge {
  const pluginContext = resolvePluginContext(context);
  const authManager = createBridgeAuthManager(pluginContext);

  const getSnapshot = (options?: CommerceAnalyticsBridgeOptions) =>
    fetchAdminJson<CommerceAnalyticsSnapshot>(
      authManager,
      `/admin/commerce-analytics${queryString(options)}`
    );

  return {
    bridgeId: CEDROS_SHOP_COMMERCE_ANALYTICS_BRIDGE_ID,
    version: 1,
    getSnapshot,
    listAbandonedCheckouts: async (options) => {
      const snapshot = await getSnapshot(options);
      return snapshot.abandonedCheckouts;
    },
    listPaymentEvents: async (options) => {
      const snapshot = await getSnapshot(options);
      return snapshot.paymentEvents;
    },
    recoverCheckout: async (request) => {
      const checkoutId = requireCheckoutId(request);
      return fetchAdminJson<Record<string, unknown>>(
        authManager,
        `/admin/commerce-analytics/abandoned-checkouts/${encodeURIComponent(checkoutId)}/recover`,
        { method: 'POST' }
      );
    },
  };
}

function resolvePluginContext(
  context: CommerceAnalyticsBridgeFactoryContext | PluginContext
): PluginContext {
  return 'pluginContext' in context ? context.pluginContext : context;
}

function createBridgeAuthManager(pluginContext: PluginContext): AdminAuthManager {
  const hasAdminPermission =
    pluginContext.hasPermission('cedros-pay:admin') ||
    pluginContext.hasPermission('admin');
  const manager = new AdminAuthManager(pluginContext.serverUrl);
  manager.setCedrosLoginAuth(pluginContext.getAccessToken(), hasAdminPermission);
  manager.setHostSessionAuth(hasAdminPermission);
  return manager;
}

function queryString(options?: CommerceAnalyticsBridgeOptions): string {
  if (!options?.limit) return '';
  const params = new URLSearchParams({ limit: String(Math.trunc(options.limit)) });
  return `?${params.toString()}`;
}

function requireCheckoutId(request: RecoverCheckoutRequest): string {
  if (!request || typeof request.checkoutId !== 'string') {
    throw new Error('checkoutId is required');
  }
  const checkoutId = request.checkoutId.trim();
  if (!checkoutId) {
    throw new Error('checkoutId is required');
  }
  return checkoutId;
}
