import { ProductVariant, ProductVariationConfig } from '../../ecommerce/types';
import { IAdminAuthManager } from './AdminAuthManager';
export interface ProductVariationsData {
    productId: string;
    variationConfig: ProductVariationConfig;
    variants: ProductVariant[];
}
export interface SaveVariationsPayload {
    variationConfig: ProductVariationConfig;
    /** If true, generates all possible variant combinations */
    generateAll?: boolean;
    /** Specific variants to create */
    createVariants?: Array<{
        optionValueIds: string[];
        inventoryQuantity?: number;
        sku?: string;
        price?: number;
    }>;
    /** Variants to update (by ID) */
    updateVariants?: Array<{
        id: string;
        inventoryQuantity?: number;
        sku?: string;
        price?: number;
        inventoryStatus?: string;
    }>;
    /** Variant IDs to delete */
    deleteVariantIds?: string[];
}
export interface UseProductVariationsOptions {
    serverUrl: string;
    productId: string;
    /** @deprecated Use authManager instead */
    apiKey?: string;
    authManager?: IAdminAuthManager;
}
/** Bulk inventory update item */
export interface BulkInventoryUpdate {
    variantId: string;
    inventoryQuantity: number;
    inventoryStatus?: 'in_stock' | 'low' | 'out_of_stock' | 'backorder';
}
export interface UseProductVariationsResult {
    data: ProductVariationsData | null;
    isLoading: boolean;
    error: string | null;
    fetch: () => Promise<void>;
    save: (payload: SaveVariationsPayload) => Promise<{
        variantsCreated: number;
    } | null>;
    /** Bulk update variant inventory without modifying variation config */
    bulkUpdateInventory: (updates: BulkInventoryUpdate[]) => Promise<boolean>;
    isSaving: boolean;
}
export declare function useProductVariations({ serverUrl, productId, apiKey, authManager, }: UseProductVariationsOptions): UseProductVariationsResult;
//# sourceMappingURL=useProductVariations.d.ts.map