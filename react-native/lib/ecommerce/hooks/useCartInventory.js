"use strict";
/**
 * Hook to fetch and track current inventory for cart items
 *
 * Provides real-time inventory data to detect:
 * - Out of stock items
 * - Low stock warnings
 * - Quantity exceeds available inventory
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCartInventory = useCartInventory;
const React = __importStar(require("react"));
const context_1 = require("../config/context");
function makeKey(productId, variantId) {
    return `${productId}::${variantId ?? ''}`;
}
function getVariantInventory(product, variantId) {
    if (variantId && product.variants?.length) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (variant) {
            return {
                qty: variant.inventoryQuantity,
                status: variant.inventoryStatus,
            };
        }
    }
    // Fall back to product-level inventory
    return {
        qty: product.inventoryQuantity,
        status: product.inventoryStatus,
    };
}
function computeInventoryInfo(cartItem, product) {
    const base = {
        productId: cartItem.productId,
        variantId: cartItem.variantId,
        isOutOfStock: false,
        exceedsAvailable: false,
        isLowStock: false,
    };
    if (!product) {
        // Product not found - could be deleted
        return {
            ...base,
            isOutOfStock: true,
            message: 'This product is no longer available',
        };
    }
    const { qty, status } = getVariantInventory(product, cartItem.variantId);
    base.availableQty = qty;
    base.status = status;
    // Check out of stock
    if (status === 'out_of_stock' || (typeof qty === 'number' && qty <= 0)) {
        return {
            ...base,
            isOutOfStock: true,
            message: 'Out of stock',
        };
    }
    // Check if requested qty exceeds available (only for finite inventory)
    if (typeof qty === 'number' && cartItem.qty > qty) {
        return {
            ...base,
            exceedsAvailable: true,
            message: qty === 0
                ? 'Out of stock'
                : `Only ${qty} available (you have ${cartItem.qty} in cart)`,
        };
    }
    // Check low stock
    if (status === 'low' || (typeof qty === 'number' && qty > 0 && qty <= 5)) {
        return {
            ...base,
            isLowStock: true,
            message: typeof qty === 'number' ? `Only ${qty} left` : 'Low stock',
        };
    }
    return base;
}
function useCartInventory({ items, refreshInterval = 30000, skip = false, }) {
    const { config } = (0, context_1.useCedrosShop)();
    const [inventory, setInventory] = React.useState(new Map());
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    // Extract unique product IDs from cart
    const productIds = React.useMemo(() => {
        const ids = new Set();
        for (const item of items) {
            ids.add(item.productId);
        }
        return Array.from(ids);
    }, [items]);
    const fetchInventory = React.useCallback(async () => {
        if (skip || productIds.length === 0) {
            setInventory(new Map());
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // Fetch products in parallel
            const products = await Promise.all(productIds.map(async (id) => {
                try {
                    // Try by slug first (most common), then by ID
                    const product = await config.adapter.getProductBySlug(id);
                    return product;
                }
                catch {
                    return null;
                }
            }));
            // Build product map
            const productMap = new Map();
            for (const product of products) {
                if (product) {
                    productMap.set(product.id, product);
                    // Also map by slug for lookup flexibility
                    if (product.slug && product.slug !== product.id) {
                        productMap.set(product.slug, product);
                    }
                }
            }
            // Compute inventory info for each cart item
            const newInventory = new Map();
            for (const item of items) {
                const key = makeKey(item.productId, item.variantId);
                const product = productMap.get(item.productId) ?? null;
                newInventory.set(key, computeInventoryInfo(item, product));
            }
            setInventory(newInventory);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to check inventory');
        }
        finally {
            setIsLoading(false);
        }
    }, [config.adapter, items, productIds, skip]);
    // Initial fetch
    React.useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);
    // Auto-refresh
    React.useEffect(() => {
        if (skip || refreshInterval <= 0 || productIds.length === 0)
            return;
        const handle = setInterval(fetchInventory, refreshInterval);
        return () => clearInterval(handle);
    }, [fetchInventory, productIds.length, refreshInterval, skip]);
    const getItemInventory = React.useCallback((productId, variantId) => {
        return inventory.get(makeKey(productId, variantId));
    }, [inventory]);
    const hasIssues = React.useMemo(() => {
        for (const info of inventory.values()) {
            if (info.isOutOfStock || info.exceedsAvailable) {
                return true;
            }
        }
        return false;
    }, [inventory]);
    return {
        inventory,
        isLoading,
        error,
        refresh: fetchInventory,
        getItemInventory,
        hasIssues,
    };
}
//# sourceMappingURL=useCartInventory.js.map