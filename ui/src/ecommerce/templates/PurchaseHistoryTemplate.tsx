import * as React from 'react';
import { cn } from '../utils/cn';
import { useOrders } from '../hooks/useOrders';
import { EmptyState } from '../components/general/EmptyState';
import { ErrorState } from '../components/general/ErrorState';
import { Skeleton } from '../components/ui/skeleton';
import { OrderDetails } from '../components/orders/OrderDetails';
import { OrderList } from '../components/orders/OrderList';
import type { Order } from '../types';

export function PurchaseHistoryTemplate({
  className,
  isSignedIn = true,
  onLogin,
}: {
  className?: string;
  isSignedIn?: boolean;
  onLogin?: () => void;
}) {
  const { orders, isLoading, error } = useOrders();
  const [selected, setSelected] = React.useState<Order | null>(null);

  if (!isSignedIn) {
    return (
      <div className={cn('min-h-screen bg-neutral-50 p-10 dark:bg-neutral-950', className)}>
        <div className="mx-auto max-w-4xl">
          <EmptyState
            title="Sign in to view your orders"
            description="Your purchase history will appear here once you're logged in."
            actionLabel={onLogin ? 'Sign in' : undefined}
            onAction={onLogin}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50', className)}>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              View past purchases and receipts.
            </p>
          </div>

          {!isLoading && !error && !selected && orders.length > 0 ? (
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {orders.length} order{orders.length === 1 ? '' : 's'}
            </div>
          ) : null}
        </header>

        {error ? <ErrorState className="mt-8" description={error} /> : null}
        {isLoading ? (
          <div className="mt-8 grid gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-8">
            <EmptyState title="No orders yet" description="When you purchase something, it will show up here." />
          </div>
        ) : selected ? (
          <div className="mt-8">
            <OrderDetails order={selected} onBack={() => setSelected(null)} />
          </div>
        ) : (
          <div className="mt-8">
            <OrderList orders={orders} onView={setSelected} />
          </div>
        )}
      </main>
    </div>
  );
}
