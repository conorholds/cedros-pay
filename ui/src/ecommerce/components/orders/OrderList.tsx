import type { Order } from '../../types';
import { cn } from '../../utils/cn';
import { OrderCard } from './OrderCard';

export function OrderList({
  orders,
  onView,
  className,
}: {
  orders: Order[];
  onView?: (order: Order) => void;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4', className)}>
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} onView={onView} />
      ))}
    </div>
  );
}
