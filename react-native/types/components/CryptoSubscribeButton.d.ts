import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import type { BillingInterval } from '../types';
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
    /** Custom container style */
    style?: ViewStyle;
    /** Custom text style */
    textStyle?: TextStyle;
    /** Loading indicator color */
    loadingColor?: string;
    /** Hide inline success/error messages */
    hideMessages?: boolean;
    /** Auto-check subscription status on mount when wallet is connected */
    autoCheckStatus?: boolean;
}
/**
 * Button component for x402 crypto subscription payments (React Native)
 *
 * Shows subscription status when active, otherwise allows subscribing
 */
export declare function CryptoSubscribeButton({ resource, interval, intervalDays, couponCode, label, disabled, onAttempt, onSuccess, onError, style, textStyle, loadingColor, hideMessages, autoCheckStatus, }: CryptoSubscribeButtonProps): React.JSX.Element;
export {};
//# sourceMappingURL=CryptoSubscribeButton.d.ts.map