import { CartItem } from '../../types';
import { CartItemInventory } from '../../hooks/useCartInventory';
export declare function CartLineItem({ item, onRemove, onSetQty, variant, className, inventory, }: {
    item: CartItem;
    onRemove: () => void;
    onSetQty: (qty: number) => void;
    variant?: 'table' | 'compact';
    className?: string;
    /** Optional inventory info for real-time stock display */
    inventory?: CartItemInventory;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=CartLineItem.d.ts.map