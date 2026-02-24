import type { CartItem } from '../../types';
import type { CartItemInventory } from '../../hooks/useCartInventory';
import * as React from 'react';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/money';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

function AlertIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 16h10l1-16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function CartLineItem({
  item,
  onRemove,
  onSetQty,
  variant = 'table',
  className,
  inventory,
}: {
  item: CartItem;
  onRemove: () => void;
  onSetQty: (qty: number) => void;
  variant?: 'table' | 'compact';
  className?: string;
  /** Optional inventory info for real-time stock display */
  inventory?: CartItemInventory;
}) {
  const lineTotal = item.unitPrice * item.qty;
  const [isConfirmingRemove, setIsConfirmingRemove] = React.useState(false);

  // Compute max quantity based on inventory
  const maxQty = React.useMemo(() => {
    if (!inventory?.availableQty) return undefined;
    return inventory.availableQty;
  }, [inventory?.availableQty]);

  // Disable increasing quantity if out of stock or at max
  const canIncreaseQty = !inventory?.isOutOfStock && (maxQty === undefined || item.qty < maxQty);

  // Determine if we should show an inventory warning
  const inventoryWarning = React.useMemo(() => {
    if (!inventory) return null;
    if (inventory.isOutOfStock) {
      return { type: 'error' as const, message: inventory.message || 'Out of stock' };
    }
    if (inventory.exceedsAvailable) {
      return { type: 'warning' as const, message: inventory.message || 'Quantity exceeds available stock' };
    }
    if (inventory.isLowStock) {
      return { type: 'info' as const, message: inventory.message || 'Low stock' };
    }
    return null;
  }, [inventory]);

  React.useEffect(() => {
    if (!isConfirmingRemove) return;
    if (item.qty === 1) return;
    setIsConfirmingRemove(false);
  }, [isConfirmingRemove, item.qty]);

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
          {item.imageSnapshot ? (
            <img src={item.imageSnapshot} alt={item.titleSnapshot} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-neutral-950 dark:text-neutral-50">
                {item.titleSnapshot}
              </div>
              <div className="mt-0.5 text-xs tabular-nums text-neutral-600 dark:text-neutral-400">
                {formatMoney({ amount: lineTotal, currency: item.currency })}
              </div>
              {inventoryWarning && (
                <div
                  className={cn(
                    'mt-1 flex items-center gap-1 text-[11px]',
                    inventoryWarning.type === 'error' && 'text-red-600 dark:text-red-400',
                    inventoryWarning.type === 'warning' && 'text-amber-600 dark:text-amber-400',
                    inventoryWarning.type === 'info' && 'text-blue-600 dark:text-blue-400'
                  )}
                >
                  <AlertIcon className="h-3 w-3 shrink-0" />
                  <span>{inventoryWarning.message}</span>
                </div>
              )}
            </div>

            <div className="flex h-12 w-[140px] shrink-0 items-center justify-end">
              {isConfirmingRemove ? (
                <div className="flex w-full flex-col items-center justify-center gap-2">
                  <div className="text-center text-[11px] font-medium leading-none text-neutral-600 dark:text-neutral-400">
                    Remove item?
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 w-[62px] px-0 text-[11px] leading-none"
                      onClick={() => setIsConfirmingRemove(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-7 w-[62px] px-0 text-[11px] leading-none"
                      onClick={onRemove}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    aria-label={item.qty === 1 ? 'Remove item' : 'Decrease quantity'}
                    onClick={() => {
                      if (item.qty === 1) {
                        setIsConfirmingRemove(true);
                        return;
                      }
                      onSetQty(item.qty - 1);
                    }}
                  >
                    {item.qty === 1 ? <TrashIcon className="h-4 w-4" /> : '-'}
                  </Button>
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(item.qty)}
                    onChange={(e) => {
                      const next = Math.floor(Number(e.target.value));
                      if (!Number.isFinite(next)) return;
                      const clamped = Math.max(1, maxQty ? Math.min(maxQty, next) : next);
                      onSetQty(clamped);
                    }}
                    className="h-8 w-11 px-2 text-center"
                    aria-label="Quantity"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    aria-label="Increase quantity"
                    onClick={() => onSetQty(maxQty ? Math.min(maxQty, item.qty + 1) : item.qty + 1)}
                    disabled={!canIncreaseQty}
                  >
                    +
                  </Button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-[64px_1fr] items-start gap-x-4 gap-y-3 sm:grid-cols-[64px_1fr_176px_120px]',
        className
      )}
    >
      <div className="h-16 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
        {item.imageSnapshot ? (
          <img src={item.imageSnapshot} alt={item.titleSnapshot} className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="col-start-2 row-start-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="truncate text-sm font-medium text-neutral-950 dark:text-neutral-50">{item.titleSnapshot}</div>
          <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50 sm:hidden">
            {formatMoney({ amount: lineTotal, currency: item.currency })}
          </div>
        </div>
        <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          {formatMoney({ amount: item.unitPrice, currency: item.currency })} each
        </div>
        {inventoryWarning && (
          <div
            className={cn(
              'mt-1.5 flex items-center gap-1 text-xs',
              inventoryWarning.type === 'error' && 'text-red-600 dark:text-red-400',
              inventoryWarning.type === 'warning' && 'text-amber-600 dark:text-amber-400',
              inventoryWarning.type === 'info' && 'text-blue-600 dark:text-blue-400'
            )}
          >
            <AlertIcon className="h-3.5 w-3.5 shrink-0" />
            <span>{inventoryWarning.message}</span>
          </div>
        )}
      </div>

      {/* Qty controls */}
      <div className="col-span-2 col-start-1 row-start-2 flex items-center justify-between gap-3 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:justify-center">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9"
            aria-label="Decrease quantity"
            onClick={() => onSetQty(Math.max(1, item.qty - 1))}
          >
            -
          </Button>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={String(item.qty)}
            onChange={(e) => {
              const next = Math.floor(Number(e.target.value));
              if (!Number.isFinite(next)) return;
              const clamped = Math.max(1, maxQty ? Math.min(maxQty, next) : next);
              onSetQty(clamped);
            }}
            className="h-9 w-14 text-center"
            aria-label="Quantity"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9"
            aria-label="Increase quantity"
            onClick={() => onSetQty(maxQty ? Math.min(maxQty, item.qty + 1) : item.qty + 1)}
            disabled={!canIncreaseQty}
          >
            +
          </Button>
        </div>

        {/* Mobile remove */}
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-2 text-xs text-red-600 dark:text-red-400 sm:hidden"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>

      {/* Total + desktop remove */}
      <div className="hidden sm:col-start-4 sm:row-start-1 sm:flex sm:flex-col sm:items-center sm:text-center">
        <div className="text-sm font-semibold tabular-nums text-neutral-950 dark:text-neutral-50">
          {formatMoney({ amount: lineTotal, currency: item.currency })}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-1 h-8 px-2 text-xs text-red-600 dark:text-red-400"
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
