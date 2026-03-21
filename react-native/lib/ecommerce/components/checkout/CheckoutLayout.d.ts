import { ViewStyle } from 'react-native';
interface CheckoutLayoutProps {
    left: React.ReactNode;
    right: React.ReactNode;
    style?: ViewStyle;
}
/**
 * Checkout Layout Component
 *
 * Provides a two-column layout for checkout: form on the left, summary on the right.
 * On mobile, it stacks vertically.
 */
export declare function CheckoutLayout({ left, right, style, }: CheckoutLayoutProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=CheckoutLayout.d.ts.map