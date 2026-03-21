/**
 * Checkout Success Page
 *
 * A ready-to-use page component for successful Stripe checkout returns.
 * Reads the checkout result from URL params and displays order details.
 *
 * @example
 * ```tsx
 * // In your router (e.g., React Navigation)
 * <Stack.Screen name="CheckoutSuccess" component={CheckoutSuccessPage} />
 * ```
 */
import { ViewStyle } from 'react-native';
export interface CheckoutSuccessPageProps {
    /** Called when user clicks "Continue shopping" */
    onContinueShopping?: () => void;
    /** Called when user clicks "View orders" */
    onViewOrders?: () => void;
    /** Additional style for the page container */
    style?: ViewStyle;
    /** Additional style for the receipt card */
    receiptStyle?: ViewStyle;
    /**
     * The current URL for parsing checkout result parameters.
     * In React Native, provide this from Linking or deep linking handlers.
     */
    currentUrl?: string | null;
}
export declare function CheckoutSuccessPage({ onContinueShopping, onViewOrders, style, receiptStyle, currentUrl, }: CheckoutSuccessPageProps): import("react").JSX.Element;
//# sourceMappingURL=CheckoutSuccessPage.d.ts.map