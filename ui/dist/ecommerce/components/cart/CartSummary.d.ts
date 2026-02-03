export declare function CartSummary({ currency, subtotal, itemCount, onCheckout, isCheckoutDisabled, checkoutDisabledReason, onRemoveUnavailable, className, }: {
    currency: string;
    subtotal: number;
    itemCount?: number;
    onCheckout: () => void;
    isCheckoutDisabled?: boolean;
    /** Message to display when checkout is disabled */
    checkoutDisabledReason?: string;
    /** Callback to remove unavailable items (shown when there are inventory issues) */
    onRemoveUnavailable?: () => void;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=CartSummary.d.ts.map