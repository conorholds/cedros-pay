/**
 * Dialog shown when inventory verification finds issues before checkout
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import type { InventoryIssue } from '../../hooks/useInventoryVerification';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
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
    </svg>
  );
}

export interface InventoryVerificationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** List of inventory issues to display */
  issues: InventoryIssue[];
  /** Callback to remove an item from cart */
  onRemoveItem: (productId: string, variantId?: string) => void;
  /** Callback to update item quantity */
  onUpdateQuantity: (productId: string, variantId: string | undefined, qty: number) => void;
  /** Callback to go back to cart page */
  onGoToCart?: () => void;
  /** Custom class name */
  className?: string;
}

export function InventoryVerificationDialog({
  open,
  onOpenChange,
  issues,
  onRemoveItem,
  onUpdateQuantity,
  onGoToCart,
  className,
}: InventoryVerificationDialogProps) {
  const hasUnavailableItems = issues.some(
    (i) => i.type === 'out_of_stock' || i.type === 'product_unavailable'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-lg', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircleIcon className="h-5 w-5 text-amber-500" />
            Inventory Update
          </DialogTitle>
          <DialogDescription>
            {hasUnavailableItems
              ? 'Some items in your cart are no longer available.'
              : 'Some items in your cart have limited availability.'}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 divide-y divide-neutral-200 dark:divide-neutral-800">
          {issues.map((issue) => (
            <IssueRow
              key={`${issue.productId}::${issue.variantId ?? ''}`}
              issue={issue}
              onRemove={() => onRemoveItem(issue.productId, issue.variantId)}
              onUpdateQty={(qty) => onUpdateQuantity(issue.productId, issue.variantId, qty)}
            />
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {onGoToCart ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onGoToCart();
              }}
            >
              Go to Cart
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueRow({
  issue,
  onRemove,
  onUpdateQty,
}: {
  issue: InventoryIssue;
  onRemove: () => void;
  onUpdateQty: (qty: number) => void;
}) {
  const isUnavailable = issue.type === 'out_of_stock' || issue.type === 'product_unavailable';

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {issue.title}
        </div>
        <div
          className={cn(
            'mt-0.5 text-sm',
            isUnavailable
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          )}
        >
          {issue.message}
        </div>
        {issue.type === 'insufficient_stock' && issue.availableQty > 0 ? (
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            You requested {issue.requestedQty}, but only {issue.availableQty} available
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {issue.type === 'insufficient_stock' && issue.availableQty > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onUpdateQty(issue.availableQty)}
          >
            Update to {issue.availableQty}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          onClick={onRemove}
        >
          <TrashIcon className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
    </div>
  );
}
