import * as React from 'react';
import { ViewStyle } from 'react-native';
interface CartSummaryProps {
    currency: string;
    subtotal: number;
    itemCount?: number;
    onCheckout: () => void;
    isCheckoutDisabled?: boolean;
    /** Message to display when checkout is disabled */
    checkoutDisabledReason?: string;
    /** Callback to remove unavailable items (shown when there are inventory issues) */
    onRemoveUnavailable?: () => void;
    style?: ViewStyle;
}
export declare function CartSummary({ currency, subtotal, itemCount, onCheckout, isCheckoutDisabled, checkoutDisabledReason, onRemoveUnavailable, style, }: CartSummaryProps): React.JSX.Element;
export {};
//# sourceMappingURL=CartSummary.d.ts.map