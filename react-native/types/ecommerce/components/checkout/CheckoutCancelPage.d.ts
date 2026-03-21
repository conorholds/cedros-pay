/**
 * Checkout Cancel Page
 *
 * A ready-to-use page component for cancelled Stripe checkout returns.
 * Displays a friendly message and allows the user to return to shopping.
 *
 * @example
 * ```tsx
 * // In your router (e.g., React Navigation)
 * <Stack.Screen name="CheckoutCancel" component={CheckoutCancelPage} />
 * ```
 */
import { ViewStyle } from 'react-native';
export interface CheckoutCancelPageProps {
    /** Called when user clicks "Back to shop" */
    onContinueShopping?: () => void;
    /** Additional style for the page container */
    style?: ViewStyle;
    /** Additional style for the receipt card */
    receiptStyle?: ViewStyle;
}
export declare function CheckoutCancelPage({ onContinueShopping, style, receiptStyle, }: CheckoutCancelPageProps): import("react").JSX.Element;
//# sourceMappingURL=CheckoutCancelPage.d.ts.map