"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialCartState = void 0;
exports.cartReducer = cartReducer;
exports.getCartCount = getCartCount;
exports.getCartSubtotal = getCartSubtotal;
function assertNever(value) {
    throw new Error(`Unhandled cart action: ${JSON.stringify(value)}`);
}
function keyOf(item) {
    return `${item.productId}::${item.variantId ?? ''}`;
}
exports.initialCartState = { items: [] };
function cartReducer(state, action) {
    switch (action.type) {
        case 'cart/hydrate': {
            return action.state;
        }
        case 'cart/add': {
            const qty = Math.max(1, Math.floor(action.qty ?? 1));
            const k = keyOf(action.item);
            const existing = state.items.find((i) => keyOf(i) === k);
            if (existing) {
                return {
                    ...state,
                    items: state.items.map((i) => (keyOf(i) === k ? { ...i, qty: i.qty + qty } : i)),
                };
            }
            return {
                ...state,
                items: [...state.items, { ...action.item, qty }],
            };
        }
        case 'cart/remove': {
            const k = `${action.productId}::${action.variantId ?? ''}`;
            return {
                ...state,
                items: state.items.filter((i) => keyOf(i) !== k),
            };
        }
        case 'cart/setQty': {
            const nextQty = Math.max(0, Math.floor(action.qty));
            const k = `${action.productId}::${action.variantId ?? ''}`;
            if (nextQty === 0) {
                return {
                    ...state,
                    items: state.items.filter((i) => keyOf(i) !== k),
                };
            }
            return {
                ...state,
                items: state.items.map((i) => (keyOf(i) === k ? { ...i, qty: nextQty } : i)),
            };
        }
        case 'cart/clear': {
            return { items: [], promoCode: undefined };
        }
        case 'cart/setPromoCode': {
            return { ...state, promoCode: action.promoCode || undefined };
        }
        case 'cart/updateHold': {
            const k = `${action.productId}::${action.variantId ?? ''}`;
            return {
                ...state,
                items: state.items.map((i) => keyOf(i) === k ? { ...i, holdId: action.holdId, holdExpiresAt: action.holdExpiresAt } : i),
            };
        }
        default: {
            return assertNever(action);
        }
    }
}
function getCartCount(items) {
    return items.reduce((acc, i) => acc + i.qty, 0);
}
function getCartSubtotal(items) {
    return items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
}
//# sourceMappingURL=cartReducer.js.map