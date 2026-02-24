import * as React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { useCedrosShop } from '../../config/context';
import { useCart } from '../../state/cart/CartProvider';
import { useCartInventory } from '../../hooks/useCartInventory';
import { CartLineItem } from './CartLineItem';
import { CartSummary } from './CartSummary';
import { CartEmpty } from './CartEmpty';
import { Separator } from '../ui/separator';

interface CartPanelProps {
  onCheckout: () => void;
  style?: ViewStyle;
}

export function CartPanel({
  onCheckout,
  style,
}: CartPanelProps) {
  const { config } = useCedrosShop();
  const cart = useCart();
  const { getItemInventory, hasIssues } = useCartInventory({
    items: cart.items,
    refreshInterval: 30000,
    skip: cart.items.length === 0,
  });

  // Handler to remove all unavailable items (out of stock or exceeds available)
  const handleRemoveUnavailable = () => {
    for (const item of cart.items) {
      const inv = getItemInventory(item.productId, item.variantId);
      if (inv?.isOutOfStock || inv?.exceedsAvailable) {
        cart.removeItem(item.productId, item.variantId);
      }
    }
  };

  if (cart.items.length === 0) {
    return (
      <CartEmpty
        title="Cart is empty"
        description="Add items from the catalog to check out."
        style={style}
      />
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.itemsContainer}>
          {cart.items.map((item, index) => (
            <View key={`${item.productId}::${item.variantId ?? ''}`}>
              {index > 0 && <Separator style={styles.itemSeparator} />}
              <View style={styles.itemWrapper}>
                <CartLineItem
                  variant="compact"
                  item={item}
                  onRemove={() => cart.removeItem(item.productId, item.variantId)}
                  onSetQty={(qty) => cart.setQty(item.productId, item.variantId, qty)}
                  inventory={getItemInventory(item.productId, item.variantId)}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.summaryContainer}>
        <Separator />
        <CartSummary
          currency={config.currency}
          subtotal={cart.subtotal}
          itemCount={cart.count}
          onCheckout={onCheckout}
          isCheckoutDisabled={cart.items.length === 0 || hasIssues}
          checkoutDisabledReason={hasIssues ? 'Some items have inventory issues' : undefined}
          onRemoveUnavailable={hasIssues ? handleRemoveUnavailable : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  itemsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemWrapper: {
    paddingVertical: 12,
  },
  itemSeparator: {
    marginHorizontal: 16,
  },
  summaryContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#ffffff',
  },
});
