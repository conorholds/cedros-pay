/**
 * Hook to fetch enabled payment methods from admin configuration.
 *
 * Automatically uses the adapter from CedrosShopProvider context.
 * Falls back to all methods enabled if config is not available.
 */

import { useState, useEffect } from 'react';
import type { PaymentMethodsConfig } from '../adapters/CommerceAdapter';
import { useOptionalCedrosShop } from '../config/context';

/** Default config when backend settings are not available */
const DEFAULT_CONFIG: PaymentMethodsConfig = {
  card: true,
  crypto: true,
  credits: false, // Credits require explicit backend setup
};

export function usePaymentMethodsConfig(): {
  config: PaymentMethodsConfig;
  isLoading: boolean;
} {
  const contextValue = useOptionalCedrosShop();
  const adapter = contextValue?.config?.adapter;

  const [config, setConfig] = useState<PaymentMethodsConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(!!adapter?.getPaymentMethodsConfig);

  useEffect(() => {
    if (!adapter?.getPaymentMethodsConfig) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchConfig() {
      try {
        const result = await adapter!.getPaymentMethodsConfig!();
        if (!cancelled && result) {
          setConfig(result);
        }
      } catch {
        // Config not available - use defaults
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, [adapter]);

  return { config, isLoading };
}
