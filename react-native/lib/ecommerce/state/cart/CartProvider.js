"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCart = useCart;
exports.CartProvider = CartProvider;
const react_1 = __importDefault(require("react"));
const context_1 = require("../../config/context");
const cartReducer_1 = require("./cartReducer");
const storage_1 = require("../../utils/storage");
const CartContext = react_1.default.createContext(null);
function useCart() {
    const value = react_1.default.useContext(CartContext);
    if (!value)
        throw new Error('useCart must be used within CartProvider');
    return value;
}
function CartProvider({ children }) {
    const { config } = (0, context_1.useCedrosShop)();
    const storageKey = config.cart?.storageKey ?? 'cedros_shop_cart_v1';
    const customerId = config.customer?.id;
    const isSignedIn = config.customer?.isSignedIn ?? Boolean(customerId);
    const syncDebounceMs = config.cart?.syncDebounceMs ?? 800;
    // Backend creates holds automatically on cart quote - we just check if the feature is available
    const holdsSupported = Boolean(config.adapter.getCartInventoryStatus);
    const [state, dispatch] = react_1.default.useReducer(cartReducer_1.cartReducer, cartReducer_1.initialCartState);
    const [isHydrated, setIsHydrated] = react_1.default.useState(false);
    const hasMergedRef = react_1.default.useRef(false);
    const lastSyncedRef = react_1.default.useRef(null);
    // Hydrate
    react_1.default.useEffect(() => {
        const storage = (0, storage_1.getSafeStorage)();
        if (!storage)
            return;
        let cancelled = false;
        (0, storage_1.readJson)(storage, storageKey).then((saved) => {
            if (cancelled)
                return;
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
    react_1.default.useEffect(() => {
        const storage = (0, storage_1.getSafeStorage)();
        if (!storage)
            return;
        (0, storage_1.writeJson)(storage, storageKey, state);
    }, [state, storageKey]);
    // Merge with server cart once when signed in
    react_1.default.useEffect(() => {
        if (!isHydrated)
            return;
        if (!isSignedIn || !customerId)
            return;
        if (!config.adapter.mergeCart && !config.adapter.getCart)
            return;
        if (hasMergedRef.current)
            return;
        hasMergedRef.current = true;
        (async () => {
            try {
                const merged = config.adapter.mergeCart
                    ? await config.adapter.mergeCart({ customerId, cart: state })
                    : await config.adapter.getCart({ customerId });
                if (merged && Array.isArray(merged.items)) {
                    dispatch({ type: 'cart/hydrate', state: merged });
                    lastSyncedRef.current = JSON.stringify(merged);
                }
            }
            catch {
                // Fail open: keep local cart
            }
        })();
    }, [config.adapter, customerId, isHydrated, isSignedIn, state]);
    // Debounced server sync
    react_1.default.useEffect(() => {
        if (!isHydrated)
            return;
        if (!isSignedIn || !customerId)
            return;
        if (!config.adapter.updateCart)
            return;
        if (!hasMergedRef.current)
            return;
        const snapshot = JSON.stringify(state);
        if (lastSyncedRef.current === snapshot)
            return;
        const handle = setTimeout(() => {
            config.adapter
                .updateCart({ customerId, cart: state })
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
    const getItemHold = react_1.default.useCallback((productId, variantId) => {
        const item = state.items.find((i) => i.productId === productId && i.variantId === variantId);
        if (!item)
            return undefined;
        return { holdId: item.holdId, expiresAt: item.holdExpiresAt };
    }, [state.items]);
    // Update hold info for an item (from cart inventory status)
    const updateItemHold = react_1.default.useCallback((productId, variantId, holdExpiresAt) => {
        dispatch({
            type: 'cart/updateHold',
            productId,
            variantId,
            holdExpiresAt,
        });
    }, []);
    const value = react_1.default.useMemo(() => {
        const count = (0, cartReducer_1.getCartCount)(state.items);
        const subtotal = (0, cartReducer_1.getCartSubtotal)(state.items);
        return {
            items: state.items,
            promoCode: state.promoCode,
            count,
            subtotal,
            addItem: (item, qty) => dispatch({ type: 'cart/add', item, qty }),
            removeItem: (productId, variantId) => dispatch({ type: 'cart/remove', productId, variantId }),
            setQty: (productId, variantId, qty) => dispatch({ type: 'cart/setQty', productId, variantId, qty }),
            clear: () => dispatch({ type: 'cart/clear' }),
            setPromoCode: (promoCode) => dispatch({ type: 'cart/setPromoCode', promoCode }),
            holdsSupported,
            getItemHold,
            updateItemHold,
        };
    }, [state.items, state.promoCode, holdsSupported, getItemHold, updateItemHold]);
    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
//# sourceMappingURL=CartProvider.js.map