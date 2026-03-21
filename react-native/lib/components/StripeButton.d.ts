import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import type { CartItem } from '../types';
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
    style?: ViewStyle;
    textStyle?: TextStyle;
    loadingColor?: string;
}
/**
 * Button component for Stripe card payments (React Native)
 *
 * Handles redirect to Stripe-hosted checkout
 */
export declare function StripeButton({ resource, items, successUrl, cancelUrl, metadata, customerEmail, couponCode, label, disabled, onAttempt, onSuccess, onError, style, textStyle, loadingColor, }: StripeButtonProps): React.JSX.Element;
export {};
//# sourceMappingURL=StripeButton.d.ts.map