import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IAdminAuthManager } from './AdminAuthManager';
import { ConfigApiClient } from './configApi';
import { fetchAdminJson } from './authFetch';
import type { SubscriptionSettings } from './types';
import { DEFAULT_SUBSCRIPTION_SETTINGS } from './subscriptionSettingsModel';

export interface CommerceFeatureFlags {
  subscriptions: boolean;
  refunds: boolean;
  returns: boolean;
  inventory: boolean;
  coupons: boolean;
  shipping: boolean;
  taxes: boolean;
}

export type CommerceFeatureKey = keyof CommerceFeatureFlags;

/** Declaration order is the operator-facing order of the workflow list. */
export const COMMERCE_FEATURE_KEYS: CommerceFeatureKey[] = [
  'subscriptions',
  'refunds',
  'returns',
  'inventory',
  'coupons',
  'shipping',
  'taxes',
];

export const DEFAULT_COMMERCE_FEATURE_FLAGS: CommerceFeatureFlags = {
  subscriptions: true,
  refunds: true,
  returns: true,
  inventory: true,
  coupons: true,
  shipping: true,
  taxes: true,
};

export interface CommerceRuntimeAvailability {
  disputes: boolean;
  returns: boolean;
}

export const DEFAULT_COMMERCE_RUNTIME_AVAILABILITY: CommerceRuntimeAvailability = {
  disputes: true,
  returns: true,
};

interface AdminRuntimeStatus {
  runtime?: string;
  unsupportedRoutes?: string[];
}

export function readCommerceRuntimeAvailability(
  status: AdminRuntimeStatus | null
): CommerceRuntimeAvailability {
  if (status?.runtime !== 'wasm') return DEFAULT_COMMERCE_RUNTIME_AVAILABILITY;
  const unsupported = new Set(status.unsupportedRoutes ?? []);
  return {
    disputes: !unsupported.has('cedros-pay:admin-disputes-list'),
    returns: !unsupported.has('cedros-pay:admin-returns-list'),
  };
}

export const SHOP_FEATURE_CONFIG_KEYS = {
  refunds: 'refunds_enabled',
  returns: 'returns_enabled',
  inventory: 'inventory_enabled',
  coupons: 'coupons_enabled',
  shipping: 'shipping_enabled',
  taxes: 'taxes_enabled',
} as const;

function readBoolean(
  config: Record<string, unknown> | undefined,
  key: string,
  fallback: boolean
): boolean {
  const value = config?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

export function readShopFeatureFlags(
  config: Record<string, unknown> | undefined
): Omit<CommerceFeatureFlags, 'subscriptions'> {
  return {
    refunds: readBoolean(config, SHOP_FEATURE_CONFIG_KEYS.refunds, true),
    returns: readBoolean(config, SHOP_FEATURE_CONFIG_KEYS.returns, true),
    inventory: readBoolean(config, SHOP_FEATURE_CONFIG_KEYS.inventory, true),
    coupons: readBoolean(config, SHOP_FEATURE_CONFIG_KEYS.coupons, true),
    shipping: readBoolean(config, SHOP_FEATURE_CONFIG_KEYS.shipping, true),
    taxes: readBoolean(config, SHOP_FEATURE_CONFIG_KEYS.taxes, true),
  };
}

export function useCommerceFeatureFlags(
  serverUrl: string,
  authManager: IAdminAuthManager | undefined
) {
  const client = useMemo(
    () => new ConfigApiClient(serverUrl, authManager),
    [serverUrl, authManager]
  );
  const [flags, setFlags] = useState<CommerceFeatureFlags>(DEFAULT_COMMERCE_FEATURE_FLAGS);
  const [availability, setAvailability] = useState<CommerceRuntimeAvailability>(
    DEFAULT_COMMERCE_RUNTIME_AVAILABILITY
  );
  const [error, setError] = useState<string | null>(null);
  // Visibility flags default to "everything on", so callers that render chrome
  // from them (hub tabs) must not commit to that guess before the first read
  // settles — otherwise a disabled workflow paints and then vanishes.
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!authManager?.isAuthenticated()) {
      setFlags(DEFAULT_COMMERCE_FEATURE_FLAGS);
      setAvailability(DEFAULT_COMMERCE_RUNTIME_AVAILABILITY);
      setIsLoading(false);
      return;
    }

    try {
      const [shopConfig, subscriptionSettings, runtimeStatus] = await Promise.all([
        client.getConfig('shop'),
        fetchAdminJson<SubscriptionSettings>(authManager, '/admin/subscriptions/settings'),
        fetchAdminJson<AdminRuntimeStatus>(authManager, '/admin/v1/status').catch(() => null),
      ]);
      setFlags({
        ...readShopFeatureFlags(shopConfig.config),
        subscriptions: subscriptionSettings.enabled ?? DEFAULT_SUBSCRIPTION_SETTINGS.enabled,
      });
      setAvailability(readCommerceRuntimeAvailability(runtimeStatus));
      setError(null);
    } catch {
      setFlags(DEFAULT_COMMERCE_FEATURE_FLAGS);
      setAvailability(DEFAULT_COMMERCE_RUNTIME_AVAILABILITY);
      setError('Failed to load feature visibility settings');
    } finally {
      setIsLoading(false);
    }
  }, [authManager, client]);

  useEffect(() => {
    load();
  }, [load]);

  return { availability, flags, error, isLoading, refresh: load };
}
