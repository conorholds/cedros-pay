import { CreditsRequirement, CartCreditsQuote } from '../types';
/**
 * Hook for Credits payment flow
 *
 * Handles:
 * - Fetching credits quotes
 * - Creating holds
 * - Authorizing payments
 * - Managing payment state
 *
 * @example
 * ```tsx
 * function CreditsPayment({ resource, amount }: { resource: string; amount: number }) {
 *   const { status, error, requirement, processPayment } = useCreditsPayment();
 *
 *   const handlePay = async () => {
 *     const result = await processPayment(resource, amount);
 *     if (result.success) {
 *       console.log('Payment successful:', result.transactionId);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handlePay} disabled={status === 'loading'}>
 *       {status === 'loading' ? 'Processing...' : `Pay ${amount} credits`}
 *     </button>
 *   );
 * }
 * ```
 */
export declare function useCreditsPayment(): {
    fetchQuote: (resource: string, couponCode?: string) => Promise<import("../types").v1.CreditsRequirement | null>;
    fetchCartQuote: (items: Array<{
        resource: string;
        quantity?: number;
        variantId?: string;
    }>, couponCode?: string) => Promise<{
        cartId: string;
        credits: CartCreditsQuote;
    } | null>;
    processPayment: (resource: string, authToken: string, couponCode?: string, metadata?: Record<string, string>) => Promise<import("../types").v1.PaymentResult>;
    processCartPayment: (items: Array<{
        resource: string;
        quantity?: number;
        variantId?: string;
    }>, authToken: string, couponCode?: string, metadata?: Record<string, string>) => Promise<{
        success: boolean;
        error: string;
        transactionId?: undefined;
    } | {
        success: boolean;
        transactionId: string | undefined;
        error: string | undefined;
    }>;
    reset: () => void;
    /** Credits requirement from quote (null if not fetched or unavailable) */
    requirement: CreditsRequirement | null;
    /** Current hold ID (if a hold is active) */
    holdId: string | null;
    status: import("../types").v1.PaymentStatus;
    error: string | null;
    transactionId: string | null;
};
//# sourceMappingURL=useCreditsPayment.d.ts.map