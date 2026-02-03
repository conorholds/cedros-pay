import * as React from 'react';
import type { Order } from '../types';
import { useCedrosShop } from '../config/context';

export function useOrders() {
  const { config } = useCedrosShop();
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    config.adapter
      .getOrderHistory()
      .then((res) => {
        if (cancelled) return;
        setOrders(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load orders');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config.adapter]);

  return { orders, isLoading, error };
}
