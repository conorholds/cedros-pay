import { default as React } from 'react';
import { CartItem, PaymentMethod } from '../types';
export interface PaymentModalProps {
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
    /** JWT token from cedros-login for credits payment authentication */
    authToken?: string;
    testPageUrl?: string;
    hideMessages?: boolean;
}
export declare const PaymentModal: React.FC<PaymentModalProps>;
//# sourceMappingURL=PaymentModal.d.ts.map