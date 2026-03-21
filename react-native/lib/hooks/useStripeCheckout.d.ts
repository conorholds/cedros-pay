/**
 * Hook for Stripe checkout flow
 *
 * Handles:
 * - Creating Stripe session
 * - Redirecting to checkout
 * - Managing payment state
 */
export declare function useStripeCheckout(): {
    processPayment: (resource: string, successUrl?: string, cancelUrl?: string, metadata?: Record<string, string>, customerEmail?: string, couponCode?: string) => Promise<import("../types").v1.PaymentResult>;
    processCartCheckout: (items: Array<{
        resource: string;
        quantity?: number;
        variantId?: string;
    }>, successUrl?: string, cancelUrl?: string, metadata?: Record<string, string>, customerEmail?: string, couponCode?: string) => Promise<import("../types").v1.PaymentResult>;
    reset: () => void;
    status: import("../types").v1.PaymentStatus;
    error: string | null;
    transactionId: string | null;
};
//# sourceMappingURL=useStripeCheckout.d.ts.map