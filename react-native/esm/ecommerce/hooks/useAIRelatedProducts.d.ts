/**
 * Hook to fetch AI-powered related product recommendations.
 *
 * Uses the adapter from CedrosShopProvider context to call the AI endpoint.
 * Results are cached by productId to avoid repeated API calls.
 */
export interface UseAIRelatedProductsOptions {
    /** Product ID to get recommendations for */
    productId?: string;
    /** Product details (alternative to productId) */
    product?: {
        name: string;
        description?: string;
        tags?: string[];
        categoryIds?: string[];
    };
    /** Whether to enable the fetch (default: true) */
    enabled?: boolean;
}
export interface UseAIRelatedProductsResult {
    /** IDs of recommended related products */
    relatedProductIds: string[] | null;
    /** AI's reasoning for the recommendations */
    reasoning: string | null;
    /** Whether the request is in progress */
    isLoading: boolean;
    /** Error message if request failed */
    error: string | null;
    /** Manually refetch recommendations */
    refetch: () => Promise<void>;
}
export declare function useAIRelatedProducts(options?: UseAIRelatedProductsOptions): UseAIRelatedProductsResult;
//# sourceMappingURL=useAIRelatedProducts.d.ts.map