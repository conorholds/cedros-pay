import { CartItem } from '../types';
/**
 * Props for StripeButton component
 */
interface StripeButtonProps {
    resource?: string;
    items?: CartItem[];
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
    customerEmail?: string;
    couponCode?: string;
    label?: string;
    disabled?: boolean;
    onAttempt?: (method: 'stripe' | 'crypto') => void;
    onSuccess?: (transactionId: string) => void;
    onError?: (error: string) => void;
    className?: string;
}
/**
 * Button component for Stripe card payments
 *
 * Handles redirect to Stripe-hosted checkout
 */
export declare function StripeButton({ resource, items, successUrl, cancelUrl, metadata, customerEmail, couponCode, label, disabled, onAttempt, onSuccess, onError, className, }: StripeButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=StripeButton.d.ts.map