import { InventoryIssue } from '../../hooks/useInventoryVerification';
export interface InventoryVerificationDialogProps {
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
    /** Custom class name */
    className?: string;
}
export declare function InventoryVerificationDialog({ open, onOpenChange, issues, onRemoveItem, onUpdateQuantity, onGoToCart, className, }: InventoryVerificationDialogProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=InventoryVerificationDialog.d.ts.map