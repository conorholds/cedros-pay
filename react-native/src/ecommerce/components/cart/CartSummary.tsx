import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { formatMoney } from '../../utils/money';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

interface CartSummaryProps {
  currency: string;
  subtotal: number;
  itemCount?: number;
  onCheckout: () => void;
  isCheckoutDisabled?: boolean;
  /** Message to display when checkout is disabled */
  checkoutDisabledReason?: string;
  /** Callback to remove unavailable items (shown when there are inventory issues) */
  onRemoveUnavailable?: () => void;
  style?: ViewStyle;
}

export function CartSummary({
  currency,
  subtotal,
  itemCount,
  onCheckout,
  isCheckoutDisabled,
  checkoutDisabledReason,
  onRemoveUnavailable,
  style,
}: CartSummaryProps) {
  return (
    <View style={[styles.container, style]}>
      <Separator />
      
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Subtotal</Text>
          {typeof itemCount === 'number' && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.itemCount}>
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </Text>
            </>
          )}
        </View>
        <Text style={styles.amount}>
          {formatMoney({ amount: subtotal, currency })}
        </Text>
      </View>

      <Button
        onPress={onCheckout}
        disabled={isCheckoutDisabled}
        style={styles.checkoutButton}
      >
        Checkout
      </Button>

      {isCheckoutDisabled && checkoutDisabledReason && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>{checkoutDisabledReason}</Text>
          {onRemoveUnavailable && (
            <TouchableOpacity onPress={onRemoveUnavailable}>
              <Text style={styles.removeUnavailableText}>
                Remove unavailable items
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingTop: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#525252',
  },
  dot: {
    fontSize: 14,
    color: '#d4d4d4',
  },
  itemCount: {
    fontSize: 14,
    color: '#525252',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  checkoutButton: {
    width: '100%',
  },
  warningContainer: {
    gap: 8,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 12,
    color: '#d97706',
    textAlign: 'center',
  },
  removeUnavailableText: {
    fontSize: 12,
    color: '#737373',
    textDecorationLine: 'underline',
  },
});
