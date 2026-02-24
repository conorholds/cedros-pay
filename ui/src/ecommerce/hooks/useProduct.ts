import * as React from 'react';
import type { Product } from '../types';
import { useCedrosShop } from '../config/context';

export function useProduct(slug: string) {
  const { config } = useCedrosShop();
  const [product, setProduct] = React.useState<Product | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    config.adapter
      .getProductBySlug(slug)
      .then((res) => {
        if (cancelled) return;
        setProduct(res);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load product');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config.adapter, slug]);

  return { product, isLoading, error };
}
