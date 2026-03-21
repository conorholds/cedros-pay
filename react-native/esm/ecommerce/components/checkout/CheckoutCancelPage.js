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
import { ScrollView, StyleSheet, } from 'react-native';
import { CheckoutReceipt } from './CheckoutReceipt';
export function CheckoutCancelPage({ onContinueShopping, style, receiptStyle, }) {
    // For cancel page, we always show the cancel state
    const result = { kind: 'cancel' };
    return (<ScrollView style={[styles.container, style]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <CheckoutReceipt result={result} onContinueShopping={onContinueShopping} style={receiptStyle}/>
    </ScrollView>);
}
const styles = StyleSheet.create({
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