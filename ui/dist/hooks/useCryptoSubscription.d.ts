import { SubscriptionStatusResponse, SubscriptionQuote, BillingInterval, PaymentResult } from '../types';
import { SubscriptionQuoteOptions } from '../managers/SubscriptionManager';
/**
 * Hook for x402 crypto subscription payments
 *
 * Handles:
 * - Checking subscription status
 * - Requesting subscription quotes
 * - Processing crypto subscription payments
 *
 * @example
 * ```tsx
 * function CryptoSubscribePage() {
 *   const { checkStatus, processPayment, status, subscriptionStatus, expiresAt } = useCryptoSubscription();
 *
 *   // Check subscription on mount
 *   useEffect(() => {
 *     if (publicKey) {
 *       checkStatus({ resource: 'plan-pro', userId: publicKey.toString() });
 *     }
 *   }, [publicKey]);
 *
 *   // Process subscription payment
 *   const handleSubscribe = async () => {
 *     await processPayment('plan-pro', 'monthly');
 *   };
 * }
 * ```
 */
export declare function useCryptoSubscription(): {
    quote: SubscriptionQuote | null;
    checkStatus: (resource: string) => Promise<SubscriptionStatusResponse | null>;
    requestQuote: (resource: string, interval: BillingInterval, options?: SubscriptionQuoteOptions) => Promise<SubscriptionQuote | null>;
    processPayment: (resource: string, interval: BillingInterval, options?: SubscriptionQuoteOptions) => Promise<PaymentResult>;
    reset: () => void;
    status: "idle" | "loading" | "checking" | "success" | "error";
    error: string | null;
    sessionId: string | null;
    subscriptionStatus: import('..').SubscriptionStatus | null;
    expiresAt: string | null;
};
//# sourceMappingURL=useCryptoSubscription.d.ts.map