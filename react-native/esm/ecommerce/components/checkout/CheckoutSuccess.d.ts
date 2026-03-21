import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface CheckoutSuccessProps {
    /** Called when user clicks "Continue shopping" */
    onContinueShopping?: () => void;
    /** Called when user clicks "View orders" */
    onViewOrders?: () => void;
    /** Additional style for the container */
    style?: ViewStyle;
    /** Additional style for the receipt card */
    receiptStyle?: ViewStyle;
    /**
     * The current URL for parsing checkout result parameters.
     * In React Native, provide this from Linking or deep linking handlers.
     */
    currentUrl?: string | null;
}
/**
 * Checkout Success Component
 *
 * Displays the result of a successful checkout with order details.
 * Reads the checkout result from URL params and displays order details.
 */
export declare function CheckoutSuccess({ onContinueShopping, onViewOrders, style, receiptStyle, currentUrl, }: CheckoutSuccessProps): React.JSX.Element;
//# sourceMappingURL=CheckoutSuccess.d.ts.map