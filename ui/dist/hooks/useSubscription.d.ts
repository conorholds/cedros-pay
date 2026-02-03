import { SubscriptionSessionRequest, SubscriptionStatusRequest, SubscriptionStatusResponse, SubscriptionQuote, BillingInterval, PaymentResult } from '../types';
import { SubscriptionQuoteOptions } from '../managers/SubscriptionManager';
/**
 * Hook for subscription management
 *
 * Handles:
 * - Creating Stripe subscription sessions and redirecting to checkout
 * - Checking subscription status (for x402 gating)
 * - Requesting subscription quotes (for x402 crypto payments)
 *
 * @example
 * ```tsx
 * function SubscribePage() {
 *   const { processSubscription, checkStatus, status, error } = useSubscription();
 *
 *   const handleSubscribe = async () => {
 *     await processSubscription({
 *       resource: 'plan-pro',
 *       interval: 'monthly',
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleSubscribe} disabled={status === 'loading'}>
 *       {status === 'loading' ? 'Processing...' : 'Subscribe'}
 *     </button>
 *   );
 * }
 * ```
 */
export declare function useSubscription(): {
    processSubscription: (request: SubscriptionSessionRequest) => Promise<PaymentResult>;
    checkStatus: (request: SubscriptionStatusRequest) => Promise<SubscriptionStatusResponse>;
    requestQuote: (resource: string, interval: BillingInterval, options?: SubscriptionQuoteOptions) => Promise<SubscriptionQuote>;
    reset: () => void;
    status: "idle" | "loading" | "checking" | "success" | "error";
    error: string | null;
    sessionId: string | null;
    subscriptionStatus: import('..').SubscriptionStatus | null;
    expiresAt: string | null;
};
//# sourceMappingURL=useSubscription.d.ts.map