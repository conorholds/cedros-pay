import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import type { CartItem, PaymentMethod } from '../types';
export interface PurchaseButtonProps {
    /** Single resource ID (for single-item payments) */
    resource?: string;
    /** Multiple items (for cart purchases) - mutually exclusive with resource */
    items?: CartItem[];
    label?: string;
    cardLabel?: string;
    cryptoLabel?: string;
    creditsLabel?: string;
    showCard?: boolean;
    showCrypto?: boolean;
    showCredits?: boolean;
    /** Track payment attempt for analytics */
    onPaymentAttempt?: (method: PaymentMethod) => void;
    /** Legacy: used for auto-Stripe fallback only */
    onPaymentSuccess?: (txId: string) => void;
    /** Legacy: used for auto-Stripe fallback only */
    onPaymentError?: (error: string) => void;
    /** Method-specific callbacks (new, preferred) */
    onStripeSuccess?: (txId: string) => void;
    onCryptoSuccess?: (txId: string) => void;
    onCreditsSuccess?: (txId: string) => void;
    onStripeError?: (error: string) => void;
    onCryptoError?: (error: string) => void;
    onCreditsError?: (error: string) => void;
    customerEmail?: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
    couponCode?: string;
    /** JWT token from cedros-login for credits payment authentication */
    authToken?: string;
    autoDetectWallets?: boolean;
    hideMessages?: boolean;
    /** Custom button style */
    style?: ViewStyle;
    /** Custom text style */
    textStyle?: TextStyle;
    /** Loading indicator color */
    loadingColor?: string;
    /** Custom modal renderer */
    renderModal?: (props: {
        isOpen: boolean;
        onClose: () => void;
        resource?: string;
        items?: CartItem[];
        cardLabel?: string;
        cryptoLabel?: string;
        creditsLabel?: string;
        showCard?: boolean;
        showCrypto?: boolean;
        showCredits?: boolean;
        onPaymentAttempt?: (method: PaymentMethod) => void;
        onPaymentSuccess?: (txId: string) => void;
        onPaymentError?: (error: string) => void;
        onStripeSuccess?: (txId: string) => void;
        onCryptoSuccess?: (txId: string) => void;
        onCreditsSuccess?: (txId: string) => void;
        onStripeError?: (error: string) => void;
        onCryptoError?: (error: string) => void;
        onCreditsError?: (error: string) => void;
        customerEmail?: string;
        successUrl?: string;
        cancelUrl?: string;
        metadata?: Record<string, string>;
        couponCode?: string;
        authToken?: string;
        hideMessages?: boolean;
    }) => React.ReactNode;
}
export declare const PurchaseButton: React.FC<PurchaseButtonProps>;
//# sourceMappingURL=PurchaseButton.d.ts.map