import React from 'react';
import type { CartItem } from '../../types';
import { useCedrosShop } from '../../config/context';
import {
  cartReducer,
  getCartCount,
  getCartSubtotal,
  initialCartState,
  type CartState,
} from './cartReducer';
import { getSafeStorage, readJson, writeJson } from '../../utils/storage';

export type CartContextValue = {
  items: CartItem[];
  promoCode?: string;
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  setQty: (productId: string, variantId: string | undefined, qty: number) => void;
  clear: () => void;
  setPromoCode: (promoCode?: string) => void;
  /** Whether inventory holds are supported (backend creates holds on cart quote) */
  holdsSupported: boolean;
  /** Get hold info for an item (populated from cart inventory status) */
  getItemHold: (productId: string, variantId?: string) => { holdId?: string; expiresAt?: string } | undefined;
  /** Update hold info for an item (called after fetching cart inventory status) */
  updateItemHold: (productId: string, variantId: string | undefined, holdExpiresAt?: string) => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);

export function useCart() {
  const value = React.useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider');
  return value;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { config } = useCedrosShop();
  const storageKey = config.cart?.storageKey ?? 'cedros_shop_cart_v1';
  const customerId = config.customer?.id;
  const isSignedIn = config.customer?.isSignedIn ?? Boolean(customerId);
  const syncDebounceMs = config.cart?.syncDebounceMs ?? 800;

  // Backend creates holds automatically on cart quote - we just check if the feature is available
  const holdsSupported = Boolean(config.adapter.getCartInventoryStatus);

  const [state, dispatch] = React.useReducer(cartReducer, initialCartState);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const hasMergedRef = React.useRef(false);
  const lastSyncedRef = React.useRef<string | null>(null);

  // Hydrate
  React.useEffect(() => {
    const storage = getSafeStorage();
    if (!storage) return;
    let cancelled = false;
    readJson<CartState>(storage, storageKey).then((saved) => {
      if (cancelled) return;
      if (saved && Array.isArray(saved.items)) {
        dispatch({ type: 'cart/hydrate', state: saved });
      }
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  // Persist
  React.useEffect(() => {
    const storage = getSafeStorage();
    if (!storage) return;
    writeJson(storage, storageKey, state);
  }, [state, storageKey]);

  // Merge with server cart once when signed in
  React.useEffect(() => {
    if (!isHydrated) return;
    if (!isSignedIn || !customerId) return;
    if (!config.adapter.mergeCart && !config.adapter.getCart) return;
    if (hasMergedRef.current) return;

    hasMergedRef.current = true;

    (async () => {
      try {
        const merged = config.adapter.mergeCart
          ? await config.adapter.mergeCart({ customerId, cart: state })
          : await config.adapter.getCart!({ customerId });

        if (merged && Array.isArray(merged.items)) {
          dispatch({ type: 'cart/hydrate', state: merged });
          lastSyncedRef.current = JSON.stringify(merged);
        }
      } catch {
        // Fail open: keep local cart
      }
    })();
  }, [config.adapter, customerId, isHydrated, isSignedIn, state]);

  // Debounced server sync
  React.useEffect(() => {
    if (!isHydrated) return;
    if (!isSignedIn || !customerId) return;
    if (!config.adapter.updateCart) return;
    if (!hasMergedRef.current) return;

    const snapshot = JSON.stringify(state);
    if (lastSyncedRef.current === snapshot) return;

    const handle = setTimeout(() => {
      config.adapter
        .updateCart!({ customerId, cart: state })
        .then(() => {
          lastSyncedRef.current = snapshot;
        })
        .catch(() => {
          // ignore
        });
    }, syncDebounceMs);

    return () => clearTimeout(handle);
  }, [config.adapter, customerId, isHydrated, isSignedIn, state, syncDebounceMs]);

  // Get hold info for an item
  const getItemHold = React.useCallback(
    (productId: string, variantId?: string) => {
      const item = state.items.find(
        (i) => i.productId === productId && i.variantId === variantId
      );
      if (!item) return undefined;
      return { holdId: item.holdId, expiresAt: item.holdExpiresAt };
    },
    [state.items]
  );

  // Update hold info for an item (from cart inventory status)
  const updateItemHold = React.useCallback(
    (productId: string, variantId: string | undefined, holdExpiresAt?: string) => {
      dispatch({
        type: 'cart/updateHold',
        productId,
        variantId,
        holdExpiresAt,
      });
    },
    []
  );

  const value = React.useMemo<CartContextValue>(() => {
    const count = getCartCount(state.items);
    const subtotal = getCartSubtotal(state.items);

    return {
      items: state.items,
      promoCode: state.promoCode,
      count,
      subtotal,
      addItem: (item, qty) => dispatch({ type: 'cart/add', item, qty }),
      removeItem: (productId, variantId) => dispatch({ type: 'cart/remove', productId, variantId }),
      setQty: (productId, variantId, qty) =>
        dispatch({ type: 'cart/setQty', productId, variantId, qty }),
      clear: () => dispatch({ type: 'cart/clear' }),
      setPromoCode: (promoCode) => dispatch({ type: 'cart/setPromoCode', promoCode }),
      holdsSupported,
      getItemHold,
      updateItemHold,
    };
  }, [state.items, state.promoCode, holdsSupported, getItemHold, updateItemHold]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
