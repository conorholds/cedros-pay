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
import { View, Text, ScrollView, StyleSheet, } from 'react-native';
import { useCheckoutResultFromUrl } from '../../hooks/useCheckoutResultFromUrl';
import { CheckoutReceipt } from './CheckoutReceipt';
export function CheckoutSuccessPage({ onContinueShopping, onViewOrders, style, receiptStyle, currentUrl, }) {
    const result = useCheckoutResultFromUrl({ url: currentUrl });
    // Show loading state while resolving
    if (result.kind === 'idle') {
        return (<View style={[styles.container, styles.loadingContainer, style]}>
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>);
    }
    return (<ScrollView style={[styles.container, style]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <CheckoutReceipt result={result} onContinueShopping={onContinueShopping} onViewOrders={onViewOrders} style={receiptStyle}/>
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