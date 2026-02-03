/**
 * Checkout Cancel Page
 *
 * A ready-to-use page component for cancelled Stripe checkout returns.
 * Displays a friendly message and allows the user to return to shopping.
 *
 * @example
 * ```tsx
 * // In your router (e.g., React Router, Next.js)
 * <Route path="/checkout/cancel" element={
 *   <CheckoutCancelPage onContinueShopping={() => navigate('/')} />
 * } />
 * ```
 */
export interface CheckoutCancelPageProps {
    /** Called when user clicks "Back to shop" */
    onContinueShopping?: () => void;
    /** Additional CSS class for the page container */
    className?: string;
    /** Additional CSS class for the receipt card */
    receiptClassName?: string;
}
export declare function CheckoutCancelPage({ onContinueShopping, className, receiptClassName, }: CheckoutCancelPageProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=CheckoutCancelPage.d.ts.map