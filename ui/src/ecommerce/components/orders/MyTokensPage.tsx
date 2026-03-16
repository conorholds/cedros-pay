/**
 * My Tokens Page
 *
 * Displays a user's on-chain tokens across all orders. Fetches redemption
 * status for each tokenized product to retrieve mint/burn signatures, then
 * renders TokenDisplay cards in a grid.
 *
 * @example
 * ```tsx
 * <MyTokensPage
 *   orders={orders}
 *   serverUrl="https://api.example.com"
 *   authToken={user.jwt}
 * />
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import type { Order, OrderLineItem } from '../../types';
import { cn } from '../../utils/cn';
import { TokenDisplay } from '../catalog/TokenDisplay';

interface RedemptionEntry {
  tokenMintSignature?: string;
  tokenBurnSignature?: string;
  status?: string;
}

type TokenItem = {
  order: Order;
  item: OrderLineItem;
  mintSignature?: string;
  burnSignature?: string;
  status?: string;
};

export interface MyTokensPageProps {
  /** User's orders (from useOrders or adapter). */
  orders: Order[];
  /** Backend server URL for fetching on-chain data. */
  serverUrl: string;
  /** JWT auth token for authenticated requests. */
  authToken?: string;
  /** Solana cluster for explorer links. */
  cluster?: 'mainnet-beta' | 'devnet' | 'testnet';
  /** Additional CSS class for the page container. */
  className?: string;
}

export function MyTokensPage({
  orders,
  serverUrl,
  authToken,
  cluster = 'mainnet-beta',
  className,
}: MyTokensPageProps) {
  const [redemptionData, setRedemptionData] = useState<
    Record<string, RedemptionEntry>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  // Collect tokenized product IDs
  const tokenizedProductIds = orders.flatMap((o) =>
    o.items
      .filter((it) => it.tokenizedAsset && it.productId)
      .map((it) => it.productId!)
  );
  const uniqueProductIds = [...new Set(tokenizedProductIds)];

  const fetchRedemptions = useCallback(async () => {
    if (!uniqueProductIds.length) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const results: Record<string, RedemptionEntry> = {};
    await Promise.all(
      uniqueProductIds.map(async (pid) => {
        try {
          const res = await fetch(
            `${serverUrl}/paywall/v1/asset-redemption/${encodeURIComponent(pid)}/status`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            const r = data.redemptions?.[0];
            if (r) {
              results[pid] = {
                tokenMintSignature: r.tokenMintSignature ?? undefined,
                tokenBurnSignature: r.tokenBurnSignature ?? undefined,
                status: r.status ?? undefined,
              };
            }
          }
        } catch {
          // per-product failure is non-critical
        }
      })
    );
    setRedemptionData(results);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl, authToken, uniqueProductIds.join(',')]);

  useEffect(() => { fetchRedemptions(); }, [fetchRedemptions]);

  // Build unified token list from orders
  const tokens: TokenItem[] = [];
  for (const order of orders) {
    for (const item of order.items) {
      if (item.tokenizedAsset && item.productId) {
        const entry = redemptionData[item.productId];
        tokens.push({
          order,
          item,
          mintSignature: entry?.tokenMintSignature,
          burnSignature: entry?.tokenBurnSignature,
          status: entry?.status,
        });
      }
    }
  }

  // Sort by order date, newest first
  tokens.sort((a, b) => {
    const da = new Date(a.order.createdAt).getTime();
    const db = new Date(b.order.createdAt).getTime();
    return db - da;
  });

  if (isLoading) {
    return (
      <div className={cn('py-8 text-center text-sm text-neutral-500 dark:text-neutral-400', className)}>
        Loading tokens...
      </div>
    );
  }

  if (!tokens.length) {
    return (
      <div className={cn('py-12 text-center', className)}>
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          No tokens yet
        </div>
        <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Tokens from tokenized asset purchases will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
        My Tokens
      </h2>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        {tokens.length} token{tokens.length === 1 ? '' : 's'}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tokens.map((t, idx) => (
          <div key={`${t.item.productId}-${idx}`} className="space-y-2">
            <div className="text-sm font-medium text-neutral-950 dark:text-neutral-50">
              {t.item.title}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Order {t.order.id.slice(0, 8)}... &middot;{' '}
              {new Date(t.order.createdAt).toLocaleDateString()}
            </div>
            <TokenDisplay
              mintSignature={t.mintSignature}
              burnSignature={t.burnSignature}
              assetClass={t.item.assetClass}
              backingValueCents={t.item.backingValueCents}
              backingCurrency={t.item.backingCurrency}
              cluster={cluster}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
