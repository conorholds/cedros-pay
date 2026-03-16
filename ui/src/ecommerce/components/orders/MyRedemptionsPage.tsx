/**
 * My Redemptions Page
 *
 * Displays a user's asset redemptions and gift card claims across all orders.
 * Fetches redemption status for tokenized asset items and shows gift card
 * recipient info.
 *
 * @example
 * ```tsx
 * <MyRedemptionsPage
 *   orders={orders}
 *   serverUrl="https://api.example.com"
 *   authToken={user.jwt}
 * />
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import type { Order, OrderLineItem } from '../../types';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/money';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { RedemptionForm } from '../checkout/RedemptionForm';

interface RedemptionStatusEntry {
  redemptionId: string;
  status: string;
  productId: string;
  createdAt?: string;
}

export interface MyRedemptionsPageProps {
  /** User's orders (from useOrders or adapter). */
  orders: Order[];
  /** Backend server URL. */
  serverUrl: string;
  /** JWT auth token for authenticated requests. */
  authToken?: string;
  /** Additional CSS class for the page container. */
  className?: string;
}

type RedemptionItem = {
  kind: 'asset';
  order: Order;
  item: OrderLineItem;
  status: string | null;
  redemptionId: string | null;
} | {
  kind: 'gift-card';
  order: Order;
  recipientEmail: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending_info: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  info_submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  return (
    <Badge className={STATUS_STYLES[status] ?? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}>
      {label}
    </Badge>
  );
}

export function MyRedemptionsPage({
  orders,
  serverUrl,
  authToken,
  className,
}: MyRedemptionsPageProps) {
  const [statuses, setStatuses] = useState<Record<string, RedemptionStatusEntry[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Collect tokenized asset product IDs from orders
  const tokenizedProductIds = orders.flatMap((o) =>
    o.items
      .filter((it) => it.tokenizedAsset && it.productId)
      .map((it) => it.productId!)
  );
  const uniqueProductIds = [...new Set(tokenizedProductIds)];

  const fetchStatuses = useCallback(async () => {
    if (!uniqueProductIds.length) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const results: Record<string, RedemptionStatusEntry[]> = {};
    await Promise.all(
      uniqueProductIds.map(async (pid) => {
        try {
          const res = await fetch(
            `${serverUrl}/paywall/v1/asset-redemption/${encodeURIComponent(pid)}/status`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            results[pid] = (data.redemptions ?? []).map((r: RedemptionStatusEntry) => ({
              ...r,
              productId: pid,
            }));
          }
        } catch {
          // per-product failure is non-critical
        }
      })
    );
    setStatuses(results);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl, authToken, uniqueProductIds.join(',')]);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  // Build unified redemption list
  const items: RedemptionItem[] = [];

  for (const order of orders) {
    // Gift card claims
    if (order.metadata?.recipient_email) {
      items.push({
        kind: 'gift-card',
        order,
        recipientEmail: order.metadata.recipient_email,
      });
    }
    // Tokenized asset redemptions
    for (const item of order.items) {
      if (item.tokenizedAsset && item.productId) {
        const redemptions = statuses[item.productId] ?? [];
        if (redemptions.length) {
          for (const r of redemptions) {
            items.push({
              kind: 'asset',
              order,
              item,
              status: r.status,
              redemptionId: r.redemptionId,
            });
          }
        } else {
          items.push({
            kind: 'asset',
            order,
            item,
            status: null,
            redemptionId: null,
          });
        }
      }
    }
  }

  // Sort by order date, newest first
  items.sort((a, b) => {
    const da = new Date(a.order.createdAt).getTime();
    const db = new Date(b.order.createdAt).getTime();
    return db - da;
  });

  if (isLoading) {
    return (
      <div className={cn('py-8 text-center text-sm text-neutral-500 dark:text-neutral-400', className)}>
        Loading redemptions...
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={cn('py-12 text-center', className)}>
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          No redemptions yet
        </div>
        <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Redemptions from tokenized asset purchases and gift card claims will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
        My Redemptions
      </h2>

      {items.map((entry, idx) => {
        if (entry.kind === 'gift-card') {
          return (
            <GiftCardClaimCard
              key={`gc-${entry.order.id}-${idx}`}
              order={entry.order}
              recipientEmail={entry.recipientEmail}
            />
          );
        }
        return (
          <AssetRedemptionCard
            key={`ar-${entry.order.id}-${entry.item.productId}-${idx}`}
            order={entry.order}
            item={entry.item}
            status={entry.status}
            isExpanded={expandedProduct === entry.item.productId}
            onToggle={() =>
              setExpandedProduct((prev) =>
                prev === entry.item.productId ? null : entry.item.productId!
              )
            }
            serverUrl={serverUrl}
            authToken={authToken}
          />
        );
      })}
    </div>
  );
}

function GiftCardClaimCard({
  order,
  recipientEmail,
}: {
  order: Order;
  recipientEmail: string;
}) {
  return (
    <Card className="rounded-xl border-neutral-200/70 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-neutral-950 dark:text-neutral-50">
              Gift card sent
            </div>
            <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              To {recipientEmail}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
              {formatMoney({ amount: order.total, currency: order.currency })}
            </div>
            <div className="mt-0.5 text-xs text-neutral-400">
              {new Date(order.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssetRedemptionCard({
  order,
  item,
  status,
  isExpanded,
  onToggle,
  serverUrl,
  authToken,
}: {
  order: Order;
  item: OrderLineItem;
  status: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  serverUrl: string;
  authToken?: string;
}) {
  return (
    <Card className="rounded-xl border-neutral-200/70 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-neutral-950 dark:text-neutral-50">
              {item.title}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>Order {order.id.slice(0, 8)}...</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status ? (
              <StatusBadge status={status} />
            ) : (
              <Badge className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                awaiting info
              </Badge>
            )}
          </div>
        </div>

        {(!status || status === 'pending_info') && (
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onToggle}
            >
              {isExpanded ? 'Hide form' : 'Submit redemption info'}
            </Button>

            {isExpanded && item.productId && (
              <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
                <RedemptionForm
                  serverUrl={serverUrl}
                  productId={item.productId}
                  authToken={authToken}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
