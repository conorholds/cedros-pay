import * as React from 'react';
import { ViewStyle } from 'react-native';
interface CheckoutErrorProps {
    /** Error message to display */
    message?: string;
    /** Called when user clicks "Try again" */
    onRetry?: () => void;
    /** Called when user clicks "Back to cart" */
    onBackToCart?: () => void;
    /** Additional style for the container */
    style?: ViewStyle;
}
/**
 * Checkout Error Component
 *
 * Displays an error state when checkout fails.
 * Provides options to retry or go back to cart.
 */
export declare function CheckoutError({ message, onRetry, onBackToCart, style, }: CheckoutErrorProps): React.JSX.Element;
export {};
//# sourceMappingURL=CheckoutError.d.ts.map