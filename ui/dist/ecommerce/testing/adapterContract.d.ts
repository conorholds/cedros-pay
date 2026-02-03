import { CommerceAdapter } from '../adapters/CommerceAdapter';
export type AdapterContractOptions = {
    pageSize?: number;
};
/**
 * Lightweight runtime validation for a CommerceAdapter.
 *
 * This is intentionally framework-agnostic so consumers can run it in Jest/Vitest.
 */
export declare function validateCommerceAdapterContract(adapter: CommerceAdapter, options?: AdapterContractOptions): Promise<void>;
//# sourceMappingURL=adapterContract.d.ts.map