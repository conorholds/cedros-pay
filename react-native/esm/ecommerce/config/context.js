import React from 'react';
const CedrosShopContext = React.createContext(null);
export function useCedrosShop() {
    const value = React.useContext(CedrosShopContext);
    if (!value) {
        throw new Error('useCedrosShop must be used within CedrosShopProvider');
    }
    return value;
}
/** Optional version that returns null when used outside CedrosShopProvider */
export function useOptionalCedrosShop() {
    return React.useContext(CedrosShopContext);
}
export function CedrosShopProvider({ config, children, }) {
    return (<CedrosShopContext.Provider value={{ config }}>{children}</CedrosShopContext.Provider>);
}
//# sourceMappingURL=context.js.map