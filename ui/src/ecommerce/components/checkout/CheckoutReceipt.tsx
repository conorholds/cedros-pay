import { cn } from '../../utils/cn';
import type { CheckoutResult } from '../../hooks/useCheckoutResultFromUrl';
import { Button } from '../ui/button';
import { formatMoney } from '../../utils/money';
import { safeHref } from '../../utils/safeHref';
import { RedemptionForm } from './RedemptionForm';

export interface CheckoutReceiptProps {
  result: CheckoutResult;
  onContinueShopping?: () => void;
  onViewOrders?: () => void;
  className?: string;
  /** Cedros Pay server URL — required for tokenized asset redemption prompts. */
  serverUrl?: string;
  /** Auth token for authenticated redemption requests. */
  authToken?: string;
  /** Product IDs for tokenized assets in this order (renders redemption form). */
  tokenizedProductIds?: string[];
}

export function CheckoutReceipt({
  result,
  onContinueShopping,
  onViewOrders,
  className,
  serverUrl,
  authToken,
  tokenizedProductIds,
}: CheckoutReceiptProps) {
  if (result.kind === 'idle') return null;

  if (result.kind === 'success') {
    return (
      <div
        className={cn(
          'rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50',
          className
        )}
      >
        <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Receipt</div>
        <h2 className="mt-2 text-2xl font-semibold">Payment successful</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Thanks for your purchase. You'll receive a confirmation email shortly.
        </p>

        {result.order?.metadata?.recipient_email ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Gift card sent
            </div>
            <div className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/80">
              A gift card has been sent to{' '}
              <span className="font-medium">{result.order.metadata.recipient_email}</span>.
              {' '}The recipient will receive credits in their account.
            </div>
          </div>
        ) : result.order?.items.some(it => it.title.toLowerCase().includes('gift card')) ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Gift card credits added
            </div>
            <div className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/80">
              Your gift card credits have been added to your account and are ready to use.
            </div>
          </div>
        ) : null}

        {result.order ? (
          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                  Order {result.order.id}
                </div>
                <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {new Date(result.order.createdAt).toLocaleString()} · {result.order.status}
                </div>
              </div>
              <div className="text-sm font-semibold">
                {formatMoney({ amount: result.order.total, currency: result.order.currency })}
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {result.order.items.slice(0, 4).map((it, idx) => (
                <div key={`${it.title}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0 truncate">{it.title}</div>
                  <div className="shrink-0 text-neutral-600 dark:text-neutral-400">Qty {it.qty}</div>
                </div>
              ))}
              {result.order.items.length > 4 ? (
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  +{result.order.items.length - 4} more item(s)
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex gap-3 text-sm">
              {safeHref(result.order.receiptUrl) ? (
                <a href={safeHref(result.order.receiptUrl)!} className="hover:underline">
                  Receipt
                </a>
              ) : null}
              {safeHref(result.order.invoiceUrl) ? (
                <a href={safeHref(result.order.invoiceUrl)!} className="hover:underline">
                  Invoice
                </a>
              ) : null}
            </div>
          </div>
        ) : result.orderId ? (
          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
            Session/Order ID: <span className="font-mono">{result.orderId}</span>
          </p>
        ) : null}

        {(() => {
          // Use explicit prop if provided, otherwise auto-derive from order data
          const resolvedIds = tokenizedProductIds ??
            result.order?.items
              .filter((it) => it.tokenizedAsset && it.productId)
              .map((it) => it.productId!) ?? [];
          if (!serverUrl || resolvedIds.length === 0) return null;
          return (
            <div className="mt-5 space-y-4">
              <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Complete your asset redemption
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Your tokenized asset was minted on-chain. Submit your redemption information below.
              </p>
              {resolvedIds.map((pid) => (
                <div key={pid} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
                  <RedemptionForm serverUrl={serverUrl} productId={pid} authToken={authToken} />
                </div>
              ))}
            </div>
          );
        })()}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {onContinueShopping ? (
            <Button type="button" onClick={onContinueShopping}>
              Continue shopping
            </Button>
          ) : null}
          {onViewOrders ? (
            <Button type="button" variant="outline" onClick={onViewOrders}>
              View orders
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (result.kind === 'cancel') {
    return (
      <div
        className={cn(
          'rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50',
          className
        )}
      >
        <h2 className="text-2xl font-semibold">Checkout cancelled</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          No charges were made. You can continue shopping and try again.
        </p>
        {onContinueShopping ? (
          <div className="mt-6">
            <Button type="button" onClick={onContinueShopping}>
              Back to shop
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50',
        className
      )}
    >
      <h2 className="text-2xl font-semibold">Payment failed</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {result.message ?? 'Something went wrong while processing your payment.'}
      </p>
      {onContinueShopping ? (
        <div className="mt-6">
          <Button type="button" onClick={onContinueShopping}>
            Back to shop
          </Button>
        </div>
      ) : null}
    </div>
  );
}
