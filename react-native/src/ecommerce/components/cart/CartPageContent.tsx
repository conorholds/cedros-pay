import * as React from 'react';
import {
  View,
  Text,
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
import { PromoCodeInput } from './PromoCodeInput';
import { Separator } from '../ui/separator';

interface CartPageContentProps {
  onCheckout: () => void;
  showPromoCode?: boolean;
  style?: ViewStyle;
}

export function CartPageContent({
  onCheckout,
  showPromoCode,
  style,
}: CartPageContentProps) {
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
        title="Your cart is empty"
        description="Add a few products and come back here when you're ready to check out."
        style={style}
      />
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Items List */}
      <View style={styles.itemsSection}>
        {/* Table Header (hidden on small screens) */}
        <View style={styles.tableHeader}>
          <View style={styles.headerImage} />
          <Text style={styles.headerText}>Item</Text>
          <Text style={[styles.headerText, styles.headerCenter]}>Qty</Text>
          <Text style={[styles.headerText, styles.headerCenter]}>Total</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {cart.items.map((item) => (
            <View key={`${item.productId}::${item.variantId ?? ''}`} style={styles.itemRow}>
              <CartLineItem
                item={item}
                onRemove={() => cart.removeItem(item.productId, item.variantId)}
                onSetQty={(qty) => cart.setQty(item.productId, item.variantId, qty)}
                inventory={getItemInventory(item.productId, item.variantId)}
              />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Summary Section */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <Separator style={styles.summarySeparator} />
        
        <View style={styles.summaryContent}>
          {showPromoCode && (
            <PromoCodeInput 
              value={cart.promoCode} 
              onApply={cart.setPromoCode} 
              style={styles.promoCode}
            />
          )}
          <CartSummary
            currency={config.currency}
            subtotal={cart.subtotal}
            onCheckout={onCheckout}
            isCheckoutDisabled={cart.items.length === 0 || hasIssues}
            checkoutDisabledReason={hasIssues ? 'Some items have inventory issues' : undefined}
            onRemoveUnavailable={hasIssues ? handleRemoveUnavailable : undefined}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 24,
  },
  itemsSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 16,
  },
  headerImage: {
    width: 64,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#737373',
    flex: 1,
  },
  headerCenter: {
    textAlign: 'center',
    flex: 0.5,
  },
  itemRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  summarySection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  summarySeparator: {
    marginVertical: 16,
  },
  summaryContent: {
    gap: 16,
  },
  promoCode: {
    marginBottom: 8,
  },
});
