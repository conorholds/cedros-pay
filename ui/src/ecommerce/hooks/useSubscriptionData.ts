import * as React from 'react';
import type { SubscriptionStatus, SubscriptionTier } from '../adapters/CommerceAdapter';
import { useCedrosShop } from '../config/context';

export function useSubscriptionData() {
  const { config } = useCedrosShop();
  const [tiers, setTiers] = React.useState<SubscriptionTier[]>([]);
  const [status, setStatus] = React.useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setError(null);
      try {
        const [t, s] = await Promise.all([
          config.adapter.listSubscriptionTiers?.() ?? Promise.resolve([]),
          config.adapter.getSubscriptionStatus?.() ?? Promise.resolve(null),
        ]);
        if (cancelled) return;
        setTiers(t);
        setStatus(s);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load subscriptions');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [config.adapter]);

  return { tiers, status, isLoading, error };
}
