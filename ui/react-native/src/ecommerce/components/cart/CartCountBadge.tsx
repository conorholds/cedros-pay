import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useCart } from '../../state/cart/CartProvider';
import { formatMoney } from '../../utils/money';

interface CartCountBadgeProps {
  onPress?: () => void;
  style?: ViewStyle;
  badgeStyle?: ViewStyle;
}

export function CartCountBadge({
  onPress,
  style,
  badgeStyle,
}: CartCountBadgeProps) {
  const cart = useCart();
  const count = cart.count;

  if (count === 0) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      <Text style={styles.cartIcon}>🛒</Text>
      <View style={[styles.badge, badgeStyle]}>
        <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
      </View>
    </TouchableOpacity>
  );
}

interface MiniCartProps {
  onPress?: () => void;
  showTotal?: boolean;
  style?: ViewStyle;
}

export function MiniCart({
  onPress,
  showTotal = true,
  style,
}: MiniCartProps) {
  const cart = useCart();

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.miniCartContainer, style]}
    >
      <View style={styles.miniCartContent}>
        <Text style={styles.miniCartIcon}>🛒</Text>
        <View style={styles.miniCartInfo}>
          <Text style={styles.miniCartCount}>
            {cart.count} item{cart.count === 1 ? '' : 's'}
          </Text>
          {showTotal && (
            <Text style={styles.miniCartTotal}>
              {formatMoney({ amount: cart.subtotal, currency: cart.items[0]?.currency || 'USD' })}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.miniCartArrow}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // CartCountBadge styles
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  cartIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },

  // MiniCart styles
  miniCartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171717',
    borderRadius: 12,
    padding: 12,
  },
  miniCartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniCartIcon: {
    fontSize: 20,
  },
  miniCartInfo: {
    gap: 2,
  },
  miniCartCount: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  miniCartTotal: {
    color: '#a3a3a3',
    fontSize: 12,
  },
  miniCartArrow: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
