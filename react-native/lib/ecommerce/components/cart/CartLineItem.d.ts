import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { CartItem } from '../../types';
import type { CartItemInventory } from '../../hooks/useCartInventory';
interface CartLineItemProps {
    item: CartItem;
    onRemove: () => void;
    onSetQty: (qty: number) => void;
    variant?: 'table' | 'compact';
    style?: ViewStyle;
    /** Optional inventory info for real-time stock display */
    inventory?: CartItemInventory;
}
export declare function CartLineItem({ item, onRemove, onSetQty, variant, style, inventory, }: CartLineItemProps): React.JSX.Element;
export {};
//# sourceMappingURL=CartLineItem.d.ts.map