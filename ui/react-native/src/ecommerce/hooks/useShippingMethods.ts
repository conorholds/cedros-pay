import * as React from 'react';
import type { CustomerInfo, ShippingMethod } from '../types';
import { useCedrosShop } from '../config/context';

export function useShippingMethods({
  enabled,
  customer,
}: {
  enabled: boolean;
  customer: CustomerInfo;
}) {
  const { config } = useCedrosShop();
  const [methods, setMethods] = React.useState<ShippingMethod[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Serialize shipping address for stable dependency comparison
  const shippingAddressKey = JSON.stringify(customer.shippingAddress ?? {});

  React.useEffect(() => {
    let cancelled = false;
    if (!enabled || !config.adapter.getShippingMethods) {
      setMethods([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    config.adapter
      .getShippingMethods({ currency: config.currency, customer })
      .then((res) => {
        if (cancelled) return;
        setMethods(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load shipping methods');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Using individual customer properties for granular control
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.adapter, config.currency, enabled, customer.email, customer.name, shippingAddressKey]);

  return { methods, isLoading, error };
}
