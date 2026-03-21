"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutSuccessPage = CheckoutSuccessPage;
const react_native_1 = require("react-native");
const useCheckoutResultFromUrl_1 = require("../../hooks/useCheckoutResultFromUrl");
const CheckoutReceipt_1 = require("./CheckoutReceipt");
function CheckoutSuccessPage({ onContinueShopping, onViewOrders, style, receiptStyle, currentUrl, }) {
    const result = (0, useCheckoutResultFromUrl_1.useCheckoutResultFromUrl)({ url: currentUrl });
    // Show loading state while resolving
    if (result.kind === 'idle') {
        return (<react_native_1.View style={[styles.container, styles.loadingContainer, style]}>
        <react_native_1.Text style={styles.loadingText}>Loading order details...</react_native_1.Text>
      </react_native_1.View>);
    }
    return (<react_native_1.ScrollView style={[styles.container, style]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <CheckoutReceipt_1.CheckoutReceipt result={result} onContinueShopping={onContinueShopping} onViewOrders={onViewOrders} style={receiptStyle}/>
    </react_native_1.ScrollView>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 16,
    },
    loadingContainer: {
        minHeight: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#737373',
    },
});
//# sourceMappingURL=CheckoutSuccessPage.js.map