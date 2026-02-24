import * as React from 'react';
import { useCedrosShop } from '../config/context';
import type { CheckoutReturnResult } from '../adapters/CommerceAdapter';
import { parseCheckoutReturn } from './checkoutReturn';

export type CheckoutResult = CheckoutReturnResult;

function searchParamsToRecord(params: URLSearchParams): Record<string, string | undefined> {
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function useCheckoutResultFromUrl(): CheckoutResult {
  const { config } = useCedrosShop();
  const [result, setResult] = React.useState<CheckoutResult>({ kind: 'idle' });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const query = searchParamsToRecord(params);

    (async () => {
      try {
        const resolved = config.adapter.resolveCheckoutReturn
          ? await config.adapter.resolveCheckoutReturn({ query })
          : parseCheckoutReturn(query);

        if (resolved.kind === 'success' && resolved.orderId && config.adapter.getOrderById) {
          const order = await config.adapter.getOrderById(resolved.orderId);
          if (order) {
            setResult({ kind: 'success', orderId: resolved.orderId, order });
            return;
          }
        }

        setResult(resolved);
      } catch (e) {
        setResult({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to resolve checkout' });
      }
    })();
  }, [config.adapter]);

  return result;
}
