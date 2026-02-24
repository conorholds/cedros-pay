/**
 * Checkout Success Page
 *
 * A ready-to-use page component for successful Stripe checkout returns.
 * Reads the checkout result from URL params and displays order details.
 *
 * @example
 * ```tsx
 * // In your router (e.g., React Router, Next.js)
 * <Route path="/checkout/success" element={
 *   <CheckoutSuccessPage
 *     onContinueShopping={() => navigate('/')}
 *     onViewOrders={() => navigate('/orders')}
 *   />
 * } />
 * ```
 */

import { useCheckoutResultFromUrl } from '../../hooks/useCheckoutResultFromUrl';
import { CheckoutReceipt } from './CheckoutReceipt';
import { cn } from '../../utils/cn';

export interface CheckoutSuccessPageProps {
  /** Called when user clicks "Continue shopping" */
  onContinueShopping?: () => void;
  /** Called when user clicks "View orders" */
  onViewOrders?: () => void;
  /** Additional CSS class for the page container */
  className?: string;
  /** Additional CSS class for the receipt card */
  receiptClassName?: string;
}

export function CheckoutSuccessPage({
  onContinueShopping,
  onViewOrders,
  className,
  receiptClassName,
}: CheckoutSuccessPageProps) {
  const result = useCheckoutResultFromUrl();

  // Show loading state while resolving
  if (result.kind === 'idle') {
    return (
      <div
        className={cn(
          'flex min-h-[50vh] items-center justify-center p-4',
          className
        )}
      >
        <div className="text-center text-neutral-600 dark:text-neutral-400">
          Loading order details...
        </div>
      </div>
    );
  }

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
        onViewOrders={onViewOrders}
        className={cn('w-full max-w-lg', receiptClassName)}
      />
    </div>
  );
}
