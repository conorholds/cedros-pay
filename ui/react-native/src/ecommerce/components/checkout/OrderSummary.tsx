import * as React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useCedrosShop } from '../../config/context';
import { useCart } from '../../state/cart/CartProvider';
import { useCheckout } from '../../state/checkout/useCheckout';
import { useStorefrontSettings } from '../../hooks/useStorefrontSettings';
import { formatMoney } from '../../utils/money';
import { Separator } from '../ui/separator';
import { PromoCodeInput } from '../cart/PromoCodeInput';

interface OrderSummaryProps {
  style?: ViewStyle;
}

export function OrderSummary({ style }: OrderSummaryProps) {
  const { config } = useCedrosShop();
  const cart = useCart();
  const checkout = useCheckout();
  const { settings: storefrontSettings } = useStorefrontSettings();

  // Show promo codes only if both code-level config AND storefront settings allow it
  const showPromoCodes = (config.checkout.allowPromoCodes ?? false) && storefrontSettings.checkout.promoCodes;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Order review</Text>
      <Separator style={styles.separator} />
      
      <View style={styles.itemsContainer}>
        {cart.items.map((it) => (
          <View key={`${it.productId}::${it.variantId ?? ''}`} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <View style={styles.itemImageContainer}>
                {it.imageSnapshot ? (
                  <Image source={{ uri: it.imageSnapshot }} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemImagePlaceholder} />
                )}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {it.titleSnapshot}
                </Text>
                <Text style={styles.itemQty}>Qty {it.qty}</Text>
              </View>
            </View>
            <Text style={styles.itemPrice}>
              {formatMoney({ amount: it.unitPrice * it.qty, currency: it.currency })}
            </Text>
          </View>
        ))}
      </View>
      
      <Separator style={styles.separator} />

      {showPromoCodes ? (
        <>
          <PromoCodeInput
            value={checkout.values.discountCode ?? cart.promoCode}
            onApply={(code) => {
              checkout.setField('discountCode', code ?? '');
              cart.setPromoCode(code);
            }}
          />
          <Separator style={styles.separator} />
        </>
      ) : null}

      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>Subtotal</Text>
        <Text style={styles.subtotalValue}>
          {formatMoney({ amount: cart.subtotal, currency: config.currency })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  separator: {
    marginVertical: 12,
  },
  itemsContainer: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    color: '#171717',
  },
  itemQty: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLabel: {
    fontSize: 14,
    color: '#737373',
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
});
