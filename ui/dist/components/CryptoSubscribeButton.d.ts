import { BillingInterval } from '../types';
/**
 * Props for CryptoSubscribeButton component
 */
interface CryptoSubscribeButtonProps {
    /** Resource/plan ID for the subscription */
    resource: string;
    /** Billing interval */
    interval: BillingInterval;
    /** Custom interval in days (only used when interval is 'custom') */
    intervalDays?: number;
    /** Coupon code for discount */
    couponCode?: string;
    /** Custom button label */
    label?: string;
    /** Disable button */
    disabled?: boolean;
    /** Track subscription attempt for analytics */
    onAttempt?: (method: 'stripe' | 'crypto') => void;
    /** Callback on successful subscription */
    onSuccess?: (transactionId: string) => void;
    /** Callback on error */
    onError?: (error: string) => void;
    /** Additional CSS class */
    className?: string;
    /** URL to open in new tab for testing (e.g., Storybook test page) */
    testPageUrl?: string;
    /** Hide inline success/error messages */
    hideMessages?: boolean;
    /** Auto-check subscription status on mount when wallet is connected */
    autoCheckStatus?: boolean;
}
/**
 * Button component for x402 crypto subscription payments
 *
 * Shows subscription status when active, otherwise allows subscribing
 *
 * @example
 * ```tsx
 * <CryptoSubscribeButton
 *   resource="plan-pro"
 *   interval="monthly"
 *   autoCheckStatus
 *   onSuccess={(txId) => console.log('Subscribed!', txId)}
 * />
 * ```
 */
export declare function CryptoSubscribeButton({ resource, interval, intervalDays, couponCode, label, disabled, onAttempt, onSuccess, onError, className, testPageUrl, hideMessages, autoCheckStatus, }: CryptoSubscribeButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CryptoSubscribeButton.d.ts.map