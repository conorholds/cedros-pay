import { default as React } from 'react';
import { CedrosShopConfig } from './types';
export type CedrosShopContextValue = {
    config: CedrosShopConfig;
};
export declare function useCedrosShop(): CedrosShopContextValue;
/** Optional version that returns null when used outside CedrosShopProvider */
export declare function useOptionalCedrosShop(): CedrosShopContextValue | null;
export declare function CedrosShopProvider({ config, children, }: {
    config: CedrosShopConfig;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=context.d.ts.map