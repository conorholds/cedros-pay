import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import type { CartItem } from '../types';
/**
 * Props for CryptoButton component
 */
interface CryptoButtonProps {
    /** Single resource ID (for single-item payments) */
    resource?: string;
    /** Multiple items (for cart payments) - mutually exclusive with resource */
    items?: CartItem[];
    /** Custom button label */
    label?: string;
    /** Disable button */
    disabled?: boolean;
    /** Track payment attempt for analytics */
    onAttempt?: (method: 'stripe' | 'crypto') => void;
    /** Callback on successful payment */
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
    /** Additional metadata to pass to backend */
    metadata?: Record<string, string>;
    /** Coupon code for discounts */
    couponCode?: string;
}
/**
 * Button component for Solana crypto payments via x402 (React Native)
 *
 * Handles wallet connection and transaction signing
 */
export declare function CryptoButton({ resource, items, label, disabled, onAttempt, onSuccess, onError, style, textStyle, loadingColor, hideMessages, metadata, couponCode, }: CryptoButtonProps): React.JSX.Element;
export {};
//# sourceMappingURL=CryptoButton.d.ts.map