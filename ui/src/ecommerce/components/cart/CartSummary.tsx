import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/money';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

export function CartSummary({
  currency,
  subtotal,
  itemCount,
  onCheckout,
  isCheckoutDisabled,
  checkoutDisabledReason,
  onRemoveUnavailable,
  className,
}: {
  currency: string;
  subtotal: number;
  itemCount?: number;
  onCheckout: () => void;
  isCheckoutDisabled?: boolean;
  /** Message to display when checkout is disabled */
  checkoutDisabledReason?: string;
  /** Callback to remove unavailable items (shown when there are inventory issues) */
  onRemoveUnavailable?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <Separator />
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <span>Subtotal</span>
          {typeof itemCount === 'number' ? (
            <>
              <span className="text-neutral-300 dark:text-neutral-700">&middot;</span>
              <span className="tabular-nums">
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </span>
            </>
          ) : null}
        </div>
        <span className="font-semibold text-neutral-950 dark:text-neutral-50">
          {formatMoney({ amount: subtotal, currency })}
        </span>
      </div>
      <Button type="button" onClick={onCheckout} disabled={isCheckoutDisabled} className="w-full">
        Checkout
      </Button>
      {isCheckoutDisabled && checkoutDisabledReason && (
        <div className="space-y-2">
          <p className="text-center text-xs text-amber-600 dark:text-amber-400">
            {checkoutDisabledReason}
          </p>
          {onRemoveUnavailable && (
            <button
              type="button"
              onClick={onRemoveUnavailable}
              className="mx-auto block text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
            >
              Remove unavailable items
            </button>
          )}
        </div>
      )}
    </div>
  );
}
