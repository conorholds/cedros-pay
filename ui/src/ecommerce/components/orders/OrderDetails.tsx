import { useState, useEffect, useCallback } from 'react';
import type { Order } from '../../types';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/money';
import { safeHref } from '../../utils/safeHref';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { RedemptionForm } from '../checkout/RedemptionForm';
import { TokenDisplay } from '../catalog/TokenDisplay';

function statusColor(status: Order['status']): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'processing':
      return 'secondary';
    case 'fulfilled':
      return 'outline';
    case 'cancelled':
      return 'outline';
    case 'refunded':
      return 'outline';
    default:
      return 'secondary';
  }
}

export function OrderDetails({
  order,
  onBack,
  className,
  serverUrl,
  authToken,
}: {
  order: Order;
  onBack?: () => void;
  className?: string;
  /** Cedros Pay server URL — enables redemption forms for tokenized asset items. */
  serverUrl?: string;
  /** Auth token for authenticated redemption requests. */
  authToken?: string;
}) {
  const createdLabel = new Date(order.createdAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const statusLabel = order.status.charAt(0).toUpperCase() + order.status.slice(1);
  const tokenizedItems = order.items.filter((it) => it.tokenizedAsset && it.productId);

  // Fetch on-chain token info (mint/burn signatures) for tokenized items
  const [tokenInfo, setTokenInfo] = useState<
    Record<string, { mintSignature?: string; burnSignature?: string; status?: string }>
  >({});

  const fetchTokenInfo = useCallback(async () => {
    if (!serverUrl || !tokenizedItems.length) return;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const results: typeof tokenInfo = {};
    await Promise.all(
      tokenizedItems.map(async (it) => {
        try {
          const res = await fetch(
            `${serverUrl}/paywall/v1/asset-redemption/${encodeURIComponent(it.productId!)}/status`,
            { headers }
          );
          if (res.ok) {
            const data = await res.json();
            const redemption = data.redemptions?.[0];
            if (redemption) {
              results[it.productId!] = {
                mintSignature: redemption.tokenMintSignature ?? undefined,
                burnSignature: redemption.tokenBurnSignature ?? undefined,
                status: redemption.status ?? undefined,
              };
            }
          }
        } catch {
          // non-critical — token info is supplementary
        }
      })
    );
    setTokenInfo(results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl, authToken, tokenizedItems.map((it) => it.productId).join(',')]);

  useEffect(() => { fetchTokenInfo(); }, [fetchTokenInfo]);

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-2xl border-neutral-200/70 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950',
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Order</span>
              <span className="truncate font-mono text-sm font-semibold text-neutral-950/80 dark:text-neutral-50/80">
                {order.id}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
              <span>{createdLabel}</span>
              <span className="text-neutral-300 dark:text-neutral-700">&middot;</span>
              <span>{statusLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            <Badge variant={statusColor(order.status)} className="capitalize">
              {statusLabel}
            </Badge>
            {onBack ? (
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={onBack}>
                Back
              </Button>
            ) : null}
          </div>
        </div>

        <Separator className="my-5" />

        <div className="space-y-3">
          {order.items.map((it, idx) => (
            <div key={`${it.title}-${idx}`} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-sm text-neutral-950 dark:text-neutral-50">{it.title}</div>
                <div className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">Qty {it.qty}</div>
              </div>
              <div className="text-right text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                {formatMoney({ amount: it.unitPrice * it.qty, currency: it.currency })}
              </div>
            </div>
          ))}
        </div>

        {order.metadata?.recipient_email ? (
          <>
            <Separator className="my-5" />
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">Gift card</div>
              <div className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-200/80">
                Sent to <span className="font-medium">{order.metadata.recipient_email}</span>
              </div>
            </div>
          </>
        ) : null}

        {serverUrl && tokenizedItems.length > 0 ? (
          <>
            <Separator className="my-5" />
            <div className="space-y-3">
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Asset redemption
              </div>
              {tokenizedItems.map((it) => {
                const info = tokenInfo[it.productId!];
                return (
                  <div key={it.productId} className="space-y-3">
                    <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{it.title}</div>
                    {info?.mintSignature && (
                      <TokenDisplay
                        mintSignature={info.mintSignature}
                        burnSignature={info.burnSignature}
                        assetClass={it.assetClass}
                        backingValueCents={it.backingValueCents}
                        backingCurrency={it.backingCurrency}
                      />
                    )}
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
                      <RedemptionForm serverUrl={serverUrl} productId={it.productId!} authToken={authToken} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        <Separator className="my-5" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Total</span>
          <span className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
            {formatMoney({ amount: order.total, currency: order.currency })}
          </span>
        </div>

        {safeHref(order.receiptUrl) || safeHref(order.invoiceUrl) ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {safeHref(order.receiptUrl) ? (
              <Button asChild type="button" variant="ghost" size="sm" className="h-8 px-2">
                <a href={safeHref(order.receiptUrl)!} target="_blank" rel="noreferrer">
                  Receipt
                </a>
              </Button>
            ) : null}
            {safeHref(order.invoiceUrl) ? (
              <Button asChild type="button" variant="ghost" size="sm" className="h-8 px-2">
                <a href={safeHref(order.invoiceUrl)!} target="_blank" rel="noreferrer">
                  Invoice
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
