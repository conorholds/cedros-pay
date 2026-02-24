/**
 * Checkout Cancel Page
 *
 * A ready-to-use page component for cancelled Stripe checkout returns.
 * Displays a friendly message and allows the user to return to shopping.
 *
 * @example
 * ```tsx
 * // In your router (e.g., React Router, Next.js)
 * <Route path="/checkout/cancel" element={
 *   <CheckoutCancelPage onContinueShopping={() => navigate('/')} />
 * } />
 * ```
 */

import { CheckoutReceipt } from './CheckoutReceipt';
import { cn } from '../../utils/cn';
import type { CheckoutResult } from '../../hooks/useCheckoutResultFromUrl';

export interface CheckoutCancelPageProps {
  /** Called when user clicks "Back to shop" */
  onContinueShopping?: () => void;
  /** Additional CSS class for the page container */
  className?: string;
  /** Additional CSS class for the receipt card */
  receiptClassName?: string;
}

export function CheckoutCancelPage({
  onContinueShopping,
  className,
  receiptClassName,
}: CheckoutCancelPageProps) {
  // For cancel page, we always show the cancel state
  const result: CheckoutResult = { kind: 'cancel' };

  return (
    <div
      className={cn(
        'flex min-h-[50vh] items-center justify-center p-4',
        className
      )}
    >
      <CheckoutReceipt
        result={result}
        onContinueShopping={onContinueShopping}
        className={cn('w-full max-w-lg', receiptClassName)}
      />
    </div>
  );
}
