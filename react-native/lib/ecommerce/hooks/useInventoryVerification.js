"use strict";
/**
 * Hook for on-demand inventory verification before checkout
 *
 * Unlike useCartInventory (which continuously monitors), this hook provides
 * a verify() function to check inventory right before payment processing.
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
exports.useInventoryVerification = useInventoryVerification;
const React = __importStar(require("react"));
const context_1 = require("../config/context");
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
    return {
        qty: product.inventoryQuantity,
        status: product.inventoryStatus,
    };
}
function getItemTitle(item, product, variantId) {
    if (!product)
        return item.titleSnapshot ?? 'Unknown Product';
    const baseTitle = product.title ?? item.titleSnapshot ?? 'Product';
    if (variantId && product.variants?.length) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (variant?.title) {
            return `${baseTitle} - ${variant.title}`;
        }
    }
    return baseTitle;
}
function checkItem(item, product) {
    const title = getItemTitle(item, product, item.variantId);
    // Product not found - could be deleted
    if (!product) {
        return {
            productId: item.productId,
            variantId: item.variantId,
            title,
            requestedQty: item.qty,
            availableQty: 0,
            type: 'product_unavailable',
            message: 'This product is no longer available',
        };
    }
    const { qty, status } = getVariantInventory(product, item.variantId);
    // Out of stock
    if (status === 'out_of_stock' || (typeof qty === 'number' && qty <= 0)) {
        return {
            productId: item.productId,
            variantId: item.variantId,
            title,
            requestedQty: item.qty,
            availableQty: 0,
            type: 'out_of_stock',
            message: 'This item is out of stock',
        };
    }
    // Insufficient stock (only for finite inventory)
    if (typeof qty === 'number' && item.qty > qty) {
        return {
            productId: item.productId,
            variantId: item.variantId,
            title,
            requestedQty: item.qty,
            availableQty: qty,
            type: 'insufficient_stock',
            message: qty === 0 ? 'This item is out of stock' : `Only ${qty} available`,
        };
    }
    // No issues
    return null;
}
function useInventoryVerification({ items, }) {
    const { config } = (0, context_1.useCedrosShop)();
    const [result, setResult] = React.useState(null);
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [error, setError] = React.useState(null);
    // Extract unique product IDs
    const productIds = React.useMemo(() => {
        const ids = new Set();
        for (const item of items) {
            ids.add(item.productId);
        }
        return Array.from(ids);
    }, [items]);
    const verify = React.useCallback(async () => {
        if (items.length === 0) {
            const emptyResult = {
                ok: true,
                issues: [],
                verifiedAt: new Date(),
            };
            setResult(emptyResult);
            return emptyResult;
        }
        setIsVerifying(true);
        setError(null);
        try {
            // Fetch all products in parallel
            const products = await Promise.all(productIds.map(async (id) => {
                try {
                    return await config.adapter.getProductBySlug(id);
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
                    if (product.slug && product.slug !== product.id) {
                        productMap.set(product.slug, product);
                    }
                }
            }
            // Check each cart item
            const issues = [];
            for (const item of items) {
                const product = productMap.get(item.productId) ?? null;
                const issue = checkItem(item, product);
                if (issue) {
                    issues.push(issue);
                }
            }
            const verificationResult = {
                ok: issues.length === 0,
                issues,
                verifiedAt: new Date(),
            };
            setResult(verificationResult);
            setIsVerifying(false);
            return verificationResult;
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to verify inventory';
            setError(errorMsg);
            setIsVerifying(false);
            // Return a failed result
            const failedResult = {
                ok: false,
                issues: [],
                verifiedAt: new Date(),
            };
            setResult(failedResult);
            return failedResult;
        }
    }, [config.adapter, items, productIds]);
    const reset = React.useCallback(() => {
        setResult(null);
        setError(null);
    }, []);
    return {
        result,
        isVerifying,
        error,
        verify,
        reset,
    };
}
//# sourceMappingURL=useInventoryVerification.js.map