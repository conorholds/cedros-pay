import React from 'react';
import type { CedrosShopConfig } from './types';

export type CedrosShopContextValue = {
  config: CedrosShopConfig;
};

const CedrosShopContext = React.createContext<CedrosShopContextValue | null>(null);

export function useCedrosShop() {
  const value = React.useContext(CedrosShopContext);
  if (!value) {
    throw new Error('useCedrosShop must be used within CedrosShopProvider');
  }
  return value;
}

/** Optional version that returns null when used outside CedrosShopProvider */
export function useOptionalCedrosShop(): CedrosShopContextValue | null {
  return React.useContext(CedrosShopContext);
}

export function CedrosShopProvider({
  config,
  children,
}: {
  config: CedrosShopConfig;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ config }), [config]);
  return (
    <CedrosShopContext.Provider value={value}>{children}</CedrosShopContext.Provider>
  );
}
