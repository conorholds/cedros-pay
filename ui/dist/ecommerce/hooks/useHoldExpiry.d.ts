import { CartItem } from '../types';
export type HoldExpiryEvent = {
    productId: string;
    variantId?: string;
    title: string;
    expiredAt: Date;
};
export interface UseHoldExpiryOptions {
    /** Cart items to monitor */
    items: CartItem[];
    /** Callback when a hold expires */
    onExpiry?: (event: HoldExpiryEvent) => void;
    /** Whether monitoring is enabled */
    enabled?: boolean;
}
export interface UseHoldExpiryResult {
    /** Items with holds that are about to expire (within 2 minutes) */
    expiringItems: Array<{
        productId: string;
        variantId?: string;
        expiresAt: Date;
        remainingMs: number;
    }>;
    /** Items with expired holds */
    expiredItems: Array<{
        productId: string;
        variantId?: string;
    }>;
}
/**
 * Monitors cart item holds and reports expiry events
 */
export declare function useHoldExpiry({ items, onExpiry, enabled, }: UseHoldExpiryOptions): UseHoldExpiryResult;
//# sourceMappingURL=useHoldExpiry.d.ts.map