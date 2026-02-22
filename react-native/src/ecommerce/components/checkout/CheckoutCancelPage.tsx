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

import {
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { CheckoutReceipt } from './CheckoutReceipt';
import type { CheckoutResult } from '../../hooks/useCheckoutResultFromUrl';

export interface CheckoutCancelPageProps {
  /** Called when user clicks "Back to shop" */
  onContinueShopping?: () => void;
  /** Additional style for the page container */
  style?: ViewStyle;
  /** Additional style for the receipt card */
  receiptStyle?: ViewStyle;
}

export function CheckoutCancelPage({
  onContinueShopping,
  style,
  receiptStyle,
}: CheckoutCancelPageProps) {
  // For cancel page, we always show the cancel state
  const result: CheckoutResult = { kind: 'cancel' };

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <CheckoutReceipt
        result={result}
        onContinueShopping={onContinueShopping}
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
});
