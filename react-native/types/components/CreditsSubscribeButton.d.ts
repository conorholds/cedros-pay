import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import type { BillingInterval, PaymentMethod } from '../types';
/**
 * Props for CreditsSubscribeButton component
 */
interface CreditsSubscribeButtonProps {
    /** Resource/plan ID for the subscription */
    resource: string;
    /** Billing interval */
    interval: BillingInterval;
    /** Custom interval in days (only used when interval is 'custom') */
    intervalDays?: number;
    /** JWT token from cedros-login for authentication */
    authToken?: string;
    /** User ID from cedros-login for subscription status checks */
    userId?: string;
    /** Coupon code for discount */
    couponCode?: string;
    /** Custom button label */
    label?: string;
    /** Disable button */
    disabled?: boolean;
    /** Track subscription attempt for analytics */
    onAttempt?: (method: PaymentMethod) => void;
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
    /** Auto-check subscription status on mount when userId is provided */
    autoCheckStatus?: boolean;
}
/**
 * Button component for credits subscription payments (React Native)
 *
 * Handles subscription payments using cedros-login credits balance.
 * Requires user to be authenticated with cedros-login.
 */
export declare function CreditsSubscribeButton({ resource, interval, intervalDays, authToken, userId, couponCode, label, disabled, onAttempt, onSuccess, onError, style, textStyle, loadingColor, hideMessages, autoCheckStatus, }: CreditsSubscribeButtonProps): React.JSX.Element;
export {};
//# sourceMappingURL=CreditsSubscribeButton.d.ts.map