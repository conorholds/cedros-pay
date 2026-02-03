import { BillingInterval } from '../types';
/**
 * Props for SubscribeButton component
 */
interface SubscribeButtonProps {
    /** Resource/plan ID for the subscription */
    resource: string;
    /** Billing interval */
    interval: BillingInterval;
    /** Custom interval in days (only used when interval is 'custom') */
    intervalDays?: number;
    /** Number of trial days (0 for no trial) */
    trialDays?: number;
    /** URL to redirect on success */
    successUrl?: string;
    /** URL to redirect on cancel */
    cancelUrl?: string;
    /** Metadata for tracking */
    metadata?: Record<string, string>;
    /** Customer email (pre-fills Stripe checkout) */
    customerEmail?: string;
    /** Coupon code for discount */
    couponCode?: string;
    /** Custom button label */
    label?: string;
    /** Disable button */
    disabled?: boolean;
    /** Track subscription attempt for analytics */
    onAttempt?: (method: 'stripe' | 'crypto') => void;
    /** Callback on successful subscription redirect */
    onSuccess?: (sessionId: string) => void;
    /** Callback on error */
    onError?: (error: string) => void;
    /** Additional CSS class */
    className?: string;
}
/**
 * Button component for Stripe subscription checkout
 *
 * Handles redirect to Stripe-hosted subscription checkout
 *
 * @example
 * ```tsx
 * <SubscribeButton
 *   resource="plan-pro"
 *   interval="monthly"
 *   trialDays={14}
 *   onSuccess={(sessionId) => console.log('Redirecting...', sessionId)}
 *   onError={(error) => console.error(error)}
 * />
 * ```
 */
export declare function SubscribeButton({ resource, interval, intervalDays, trialDays, successUrl, cancelUrl, metadata, customerEmail, couponCode, label, disabled, onAttempt, onSuccess, onError, className, }: SubscribeButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SubscribeButton.d.ts.map