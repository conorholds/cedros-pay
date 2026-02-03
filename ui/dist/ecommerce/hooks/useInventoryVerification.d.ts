import { CartItem } from '../types';
export type InventoryIssue = {
    productId: string;
    variantId?: string;
    /** Product/variant title for display */
    title: string;
    /** Quantity requested in cart */
    requestedQty: number;
    /** Currently available quantity (0 if out of stock) */
    availableQty: number;
    /** Type of issue */
    type: 'out_of_stock' | 'insufficient_stock' | 'product_unavailable';
    /** Human-readable message */
    message: string;
};
export type VerificationResult = {
    /** Whether all items passed verification */
    ok: boolean;
    /** List of items with inventory issues */
    issues: InventoryIssue[];
    /** Timestamp of verification */
    verifiedAt: Date;
};
export interface UseInventoryVerificationOptions {
    /** Cart items to verify */
    items: CartItem[];
}
export interface UseInventoryVerificationResult {
    /** Most recent verification result (null if never verified) */
    result: VerificationResult | null;
    /** True while verification is in progress */
    isVerifying: boolean;
    /** Error if verification failed entirely */
    error: string | null;
    /** Trigger verification and return result */
    verify: () => Promise<VerificationResult>;
    /** Clear the current result */
    reset: () => void;
}
export declare function useInventoryVerification({ items, }: UseInventoryVerificationOptions): UseInventoryVerificationResult;
//# sourceMappingURL=useInventoryVerification.d.ts.map