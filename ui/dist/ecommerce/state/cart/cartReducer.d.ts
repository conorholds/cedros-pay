import { CartItem, CartSnapshot } from '../../types';
export type CartState = CartSnapshot;
export type CartAction = {
    type: 'cart/hydrate';
    state: CartState;
} | {
    type: 'cart/add';
    item: Omit<CartItem, 'qty'>;
    qty?: number;
} | {
    type: 'cart/remove';
    productId: string;
    variantId?: string;
} | {
    type: 'cart/setQty';
    productId: string;
    variantId?: string;
    qty: number;
} | {
    type: 'cart/clear';
} | {
    type: 'cart/setPromoCode';
    promoCode?: string;
} | {
    type: 'cart/updateHold';
    productId: string;
    variantId?: string;
    holdId?: string;
    holdExpiresAt?: string;
};
export declare const initialCartState: CartState;
export declare function cartReducer(state: CartState, action: CartAction): CartState;
export declare function getCartCount(items: CartItem[]): number;
export declare function getCartSubtotal(items: CartItem[]): number;
//# sourceMappingURL=cartReducer.d.ts.map