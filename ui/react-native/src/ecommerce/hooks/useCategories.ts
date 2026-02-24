import * as React from 'react';
import type { Category } from '../types';
import { useCedrosShop } from '../config/context';

export function useCategories() {
  const { config } = useCedrosShop();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    config.adapter
      .listCategories()
      .then((res) => {
        if (cancelled) return;
        setCategories(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load categories');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config.adapter]);

  return { categories, isLoading, error };
}
