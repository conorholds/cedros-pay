import React from 'react';
import { ViewStyle } from 'react-native';
import type { CartItem, PaymentMethod } from '../types';
export interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Single resource ID (for single-item payments) */
    resource?: string;
    /** Multiple items (for cart purchases) - mutually exclusive with resource */
    items?: CartItem[];
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
    hideMessages?: boolean;
    /** Custom modal content style */
    contentStyle?: ViewStyle;
}
export declare const PaymentModal: React.FC<PaymentModalProps>;
//# sourceMappingURL=PaymentModal.d.ts.map