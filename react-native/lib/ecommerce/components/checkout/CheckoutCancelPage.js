"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutCancelPage = CheckoutCancelPage;
const react_native_1 = require("react-native");
const CheckoutReceipt_1 = require("./CheckoutReceipt");
function CheckoutCancelPage({ onContinueShopping, style, receiptStyle, }) {
    // For cancel page, we always show the cancel state
    const result = { kind: 'cancel' };
    return (<react_native_1.ScrollView style={[styles.container, style]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <CheckoutReceipt_1.CheckoutReceipt result={result} onContinueShopping={onContinueShopping} style={receiptStyle}/>
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
});
//# sourceMappingURL=CheckoutCancelPage.js.map