import type { ListResult, Product } from '../types';
import type { ProductListParams } from '../adapters/CommerceAdapter';
export declare function useProducts(params: ProductListParams): {
    data: ListResult<Product> | null;
    isLoading: boolean;
    error: string | null;
};
//# sourceMappingURL=useProducts.d.ts.map