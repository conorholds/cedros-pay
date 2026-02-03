import { default as React } from 'react';
import { CartItem } from '../../types';
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
    getItemHold: (productId: string, variantId?: string) => {
        holdId?: string;
        expiresAt?: string;
    } | undefined;
    /** Update hold info for an item (called after fetching cart inventory status) */
    updateItemHold: (productId: string, variantId: string | undefined, holdExpiresAt?: string) => void;
};
export declare function useCart(): CartContextValue;
export declare function CartProvider({ children }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=CartProvider.d.ts.map