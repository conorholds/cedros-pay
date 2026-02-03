/**
 * Checkout Success Page
 *
 * A ready-to-use page component for successful Stripe checkout returns.
 * Reads the checkout result from URL params and displays order details.
 *
 * @example
 * ```tsx
 * // In your router (e.g., React Router, Next.js)
 * <Route path="/checkout/success" element={
 *   <CheckoutSuccessPage
 *     onContinueShopping={() => navigate('/')}
 *     onViewOrders={() => navigate('/orders')}
 *   />
 * } />
 * ```
 */
export interface CheckoutSuccessPageProps {
    /** Called when user clicks "Continue shopping" */
    onContinueShopping?: () => void;
    /** Called when user clicks "View orders" */
    onViewOrders?: () => void;
    /** Additional CSS class for the page container */
    className?: string;
    /** Additional CSS class for the receipt card */
    receiptClassName?: string;
}
export declare function CheckoutSuccessPage({ onContinueShopping, onViewOrders, className, receiptClassName, }: CheckoutSuccessPageProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=CheckoutSuccessPage.d.ts.map