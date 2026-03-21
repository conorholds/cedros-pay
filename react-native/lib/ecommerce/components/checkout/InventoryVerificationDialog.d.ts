/**
 * Dialog shown when inventory verification finds issues before checkout
 */
import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { InventoryIssue } from '../../hooks/useInventoryVerification';
interface InventoryVerificationDialogProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Callback when dialog should close */
    onOpenChange: (open: boolean) => void;
    /** List of inventory issues to display */
    issues: InventoryIssue[];
    /** Callback to remove an item from cart */
    onRemoveItem: (productId: string, variantId?: string) => void;
    /** Callback to update item quantity */
    onUpdateQuantity: (productId: string, variantId: string | undefined, qty: number) => void;
    /** Callback to go back to cart page */
    onGoToCart?: () => void;
    /** Custom style */
    style?: ViewStyle;
}
export declare function InventoryVerificationDialog({ open, onOpenChange, issues, onRemoveItem, onUpdateQuantity, onGoToCart, style, }: InventoryVerificationDialogProps): React.JSX.Element;
export {};
//# sourceMappingURL=InventoryVerificationDialog.d.ts.map