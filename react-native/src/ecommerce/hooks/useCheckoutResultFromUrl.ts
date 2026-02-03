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

function parseUrlQuery(url: string): Record<string, string | undefined> {
  try {
    const parsed = new URL(url);
    return searchParamsToRecord(parsed.searchParams);
  } catch {
    // Fallback for non-standard URLs
    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) return {};
    const search = url.slice(queryIndex + 1);
    return searchParamsToRecord(new URLSearchParams(search));
  }
}

export interface UseCheckoutResultFromUrlOptions {
  /**
   * The URL to parse for checkout result parameters.
   * In React Native, this should be provided from Linking or deep linking handlers.
   */
  url: string | null | undefined;
}

export function useCheckoutResultFromUrl(options: UseCheckoutResultFromUrlOptions): CheckoutResult {
  const { config } = useCedrosShop();
  const [result, setResult] = React.useState<CheckoutResult>({ kind: 'idle' });
  const { url } = options;

  React.useEffect(() => {
    if (!url) return;

    const query = parseUrlQuery(url);

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
  }, [config.adapter, url]);

  return result;
}
