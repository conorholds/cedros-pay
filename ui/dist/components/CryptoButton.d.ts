import { CartItem } from '../types';
/**
 * Props for CryptoButton component
 */
interface CryptoButtonProps {
    resource?: string;
    items?: CartItem[];
    label?: string;
    disabled?: boolean;
    onAttempt?: (method: 'stripe' | 'crypto') => void;
    onSuccess?: (transactionId: string) => void;
    onError?: (error: string) => void;
    className?: string;
    testPageUrl?: string;
    hideMessages?: boolean;
    metadata?: Record<string, string>;
    couponCode?: string;
}
/**
 * Button component for Solana crypto payments via x402
 *
 * Handles wallet connection and transaction signing
 */
export declare function CryptoButton({ resource, items, label, disabled, onAttempt, onSuccess, onError, className, testPageUrl, hideMessages, metadata, couponCode, }: CryptoButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CryptoButton.d.ts.map