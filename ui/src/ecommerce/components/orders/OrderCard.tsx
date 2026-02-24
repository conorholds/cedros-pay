import type { Order } from '../../types';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/money';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

function statusColor(status: Order['status']): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'created':
      return 'secondary';
    case 'paid':
      return 'default';
    case 'processing':
      return 'secondary';
    case 'fulfilled':
      return 'outline';
    case 'shipped':
      return 'default';
    case 'delivered':
      return 'outline';
    case 'cancelled':
      return 'outline';
    case 'refunded':
      return 'outline';
    default:
      return 'secondary';
  }
}

export function OrderCard({
  order,
  onView,
  className,
}: {
  order: Order;
  onView?: (order: Order) => void;
  className?: string;
}) {
  const itemsLabel = `${order.items.length} item${order.items.length === 1 ? '' : 's'}`;
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
        'group overflow-hidden rounded-2xl border-neutral-200/70 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950',
        className
      )}
    >
      <CardContent className="p-5">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Order</span>
              <span className="truncate font-mono text-sm font-semibold text-neutral-950/80 dark:text-neutral-50/80">
                {order.id}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">{createdLabel}</div>
          </div>

          <div className="flex items-start justify-end">
            <Badge variant={statusColor(order.status)} className="capitalize">
              {statusLabel}
            </Badge>
          </div>

          <div className="text-sm text-neutral-600 dark:text-neutral-400">{itemsLabel}</div>
          <div className="text-right text-sm font-semibold text-neutral-950 dark:text-neutral-50">
            {formatMoney({ amount: order.total, currency: order.currency })}
          </div>

          <div className="col-span-2 mt-3 flex items-center justify-between gap-3 border-t border-neutral-200/70 pt-3 dark:border-neutral-800">
            <div className="flex items-center gap-1">
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
            {onView ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onView(order)}
              >
                Details
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
