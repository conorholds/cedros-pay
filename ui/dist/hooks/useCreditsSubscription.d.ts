import { SubscriptionStatusResponse, CreditsRequirement, BillingInterval, PaymentResult } from '../types';
/**
 * Options for subscription quote and payment
 */
interface CreditsSubscriptionOptions {
    couponCode?: string;
    intervalDays?: number;
}
/**
 * Hook for credits subscription payments
 *
 * Handles:
 * - Checking subscription status
 * - Requesting subscription quotes with credits
 * - Processing credits subscription payments
 *
 * @example
 * ```tsx
 * function CreditsSubscribePage() {
 *   const { checkStatus, processPayment, status, subscriptionStatus } = useCreditsSubscription();
 *
 *   const handleSubscribe = async () => {
 *     await processPayment('plan-pro', 'monthly', authToken);
 *   };
 * }
 * ```
 */
export declare function useCreditsSubscription(): {
    checkStatus: (resource: string, userId: string) => Promise<SubscriptionStatusResponse | null>;
    requestQuote: (resource: string, _interval: BillingInterval, options?: CreditsSubscriptionOptions) => Promise<CreditsRequirement | null>;
    processPayment: (resource: string, interval: BillingInterval, authToken: string, options?: CreditsSubscriptionOptions) => Promise<PaymentResult>;
    reset: () => void;
    /** Credits requirement from subscription quote */
    creditsRequirement: CreditsRequirement | null;
    status: "idle" | "loading" | "checking" | "success" | "error";
    error: string | null;
    sessionId: string | null;
    subscriptionStatus: import('..').SubscriptionStatus | null;
    expiresAt: string | null;
};
export {};
//# sourceMappingURL=useCreditsSubscription.d.ts.map