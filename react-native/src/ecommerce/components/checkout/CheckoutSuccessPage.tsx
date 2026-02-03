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

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useCheckoutResultFromUrl } from '../../hooks/useCheckoutResultFromUrl';
import { CheckoutReceipt } from './CheckoutReceipt';

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

export function CheckoutSuccessPage({
  onContinueShopping,
  onViewOrders,
  style,
  receiptStyle,
  currentUrl,
}: CheckoutSuccessPageProps) {
  const result = useCheckoutResultFromUrl({ url: currentUrl });

  // Show loading state while resolving
  if (result.kind === 'idle') {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <CheckoutReceipt
        result={result}
        onContinueShopping={onContinueShopping}
        onViewOrders={onViewOrders}
        style={receiptStyle}
      />
    </ScrollView>
  );
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
