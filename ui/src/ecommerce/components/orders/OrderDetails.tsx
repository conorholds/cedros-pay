import type { Order } from '../../types';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/money';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';

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
}: {
  order: Order;
  onBack?: () => void;
  className?: string;
}) {
  const createdLabel = new Date(order.createdAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const statusLabel = order.status.charAt(0).toUpperCase() + order.status.slice(1);

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

        <Separator className="my-5" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">Total</span>
          <span className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
            {formatMoney({ amount: order.total, currency: order.currency })}
          </span>
        </div>

        {order.receiptUrl || order.invoiceUrl ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {order.receiptUrl ? (
              <Button asChild type="button" variant="ghost" size="sm" className="h-8 px-2">
                <a href={order.receiptUrl} target="_blank" rel="noreferrer">
                  Receipt
                </a>
              </Button>
            ) : null}
            {order.invoiceUrl ? (
              <Button asChild type="button" variant="ghost" size="sm" className="h-8 px-2">
                <a href={order.invoiceUrl} target="_blank" rel="noreferrer">
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
