import { CartItem } from '../types';
/**
 * Props for CreditsButton component
 */
interface CreditsButtonProps {
    /** Single resource ID (for single-item payments) */
    resource?: string;
    /** Multiple items (for cart checkout) - mutually exclusive with resource */
    items?: CartItem[];
    /**
     * @deprecated No longer required - server determines price during hold creation.
     * Kept for backwards compatibility but ignored.
     */
    creditsRequirement?: unknown;
    /** JWT token from cedros-login for user authentication */
    authToken?: string;
    /** Metadata for tracking (e.g., userId, session) */
    metadata?: Record<string, string>;
    /** Optional coupon code for discount */
    couponCode?: string;
    /** Button label */
    label?: string;
    /** Disable button */
    disabled?: boolean;
    /** Track payment attempt for analytics */
    onAttempt?: (method: 'credits') => void;
    /** Called on successful payment */
    onSuccess?: (transactionId: string) => void;
    /** Called on payment error */
    onError?: (error: string) => void;
    /** Custom CSS class name */
    className?: string;
}
/**
 * Button component for Credits payments
 *
 * Handles payment using cedros-login credits balance.
 * Requires user to be authenticated with cedros-login.
 */
export declare function CreditsButton({ resource, items, authToken, metadata, couponCode, label, disabled, onAttempt, onSuccess, onError, className, }: CreditsButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CreditsButton.d.ts.map