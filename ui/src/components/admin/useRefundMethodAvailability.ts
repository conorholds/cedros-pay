import { useCallback, useEffect, useState } from 'react';
import { fetchAdminJson } from './authFetch';
import type { IAdminAuthManager } from './AdminAuthManager';
import type { GetConfigResponse } from './configApi';
import { getLogger } from '../../utils/logger';
import { useBackgroundRefresh } from './useBackgroundRefresh';

export interface RefundMethodAvailability {
  stripe: boolean;
  credits: boolean;
  x402: boolean;
}

function isEnabled(config: Record<string, unknown> | undefined, field = 'enabled'): boolean {
  return config?.[field] === true;
}

export function resolveRefundMethodAvailability(
  stripeConfig: GetConfigResponse,
  cedrosLoginConfig: GetConfigResponse,
  x402Config: GetConfigResponse
): RefundMethodAvailability {
  return {
    stripe: isEnabled(stripeConfig.config),
    credits:
      isEnabled(cedrosLoginConfig.config) &&
      isEnabled(cedrosLoginConfig.config, 'credits_enabled'),
    x402: isEnabled(x402Config.config),
  };
}

export function useRefundMethodAvailability(
  authManager: IAdminAuthManager | undefined
) {
  const [availability, setAvailability] = useState<RefundMethodAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAvailability = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [stripeConfig, cedrosLoginConfig, x402Config] = await Promise.all([
        fetchAdminJson<GetConfigResponse>(authManager, '/admin/config/stripe?redact_secrets=true'),
        fetchAdminJson<GetConfigResponse>(authManager, '/admin/config/cedros_login?redact_secrets=true'),
        fetchAdminJson<GetConfigResponse>(authManager, '/admin/config/x402?redact_secrets=true'),
      ]);
      setAvailability(
        resolveRefundMethodAvailability(stripeConfig, cedrosLoginConfig, x402Config)
      );
    } catch {
      getLogger().error('[RefundsSection] Failed to load refund method settings');
      setAvailability({ stripe: false, credits: false, x402: false });
      setError('Failed to load refund payment settings');
    } finally {
      setIsLoading(false);
    }
  }, [authManager]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  useBackgroundRefresh(loadAvailability, { enabled: !!error, intervalMs: 20000 });

  return { availability, isLoading, error };
}
