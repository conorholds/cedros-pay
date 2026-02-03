import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useCedrosTheme } from '../context';

/**
 * Format amount for display
 * @param amount - Amount in cents or atomic units
 * @param currency - Currency code
 * @returns Formatted amount string
 */
function formatAmount(amount: number, currency: string): string {
  // Handle crypto tokens (USDC, USDT, etc.)
  if (['USDC', 'USDT', 'PYUSD', 'CASH'].includes(currency.toUpperCase())) {
    // Convert from atomic units (6 decimals for SPL tokens)
    const formatted = (amount / 1_000_000).toFixed(2);
    return `${formatted} ${currency.toUpperCase()}`;
  }

  // Handle fiat currencies
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  } catch {
    // Fallback if currency code is invalid
    return `$${(amount / 100).toFixed(2)} ${currency}`;
  }
}

/**
 * Props for ProductPrice component
 */
export interface ProductPriceProps {
  /** Price amount in cents (fiat) or atomic units (crypto) */
  amount: number;
  /** Currency code (USD, EUR, USDC, etc.) */
  currency: string;
  /** Original price before discount (for showing strike-through) */
  originalAmount?: number;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Custom container style */
  style?: ViewStyle;
  /** Custom price text style */
  priceStyle?: TextStyle;
  /** Custom original price text style */
  originalPriceStyle?: TextStyle;
}

/**
 * ProductPrice component for displaying formatted prices (React Native)
 *
 * Features:
 * - Automatic formatting for fiat and crypto currencies
 * - Strike-through original price when showing discounts
 * - Multiple size variants
 * - Theme integration
 */
export function ProductPrice({
  amount,
  currency,
  originalAmount,
  size = 'medium',
  style,
  priceStyle,
  originalPriceStyle,
}: ProductPriceProps) {
  const theme = useCedrosTheme();

  // Get font size based on size prop
  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 24;
      case 'medium':
      default:
        return 18;
    }
  };

  // Get original price font size (slightly smaller)
  const getOriginalFontSize = () => {
    return getFontSize() * 0.8;
  };

  const formattedPrice = formatAmount(amount, currency);
  const hasDiscount = originalAmount && originalAmount > amount;

  return (
    <View style={[styles.container, style]}>
      {hasDiscount && (
        <Text
          style={[
            styles.originalPrice,
            {
              fontSize: getOriginalFontSize(),
              color: theme.tokens?.surfaceText || '#6b7280',
            },
            originalPriceStyle,
          ]}
        >
          {formatAmount(originalAmount, currency)}
        </Text>
      )}
      <Text
        style={[
          styles.price,
          {
            fontSize: getFontSize(),
            color: theme.tokens?.surfaceText || '#111827',
          },
          priceStyle,
        ]}
      >
        {formattedPrice}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  price: {
    fontWeight: '600',
  },
});

/**
 * Payment method type for badge display
 */
export type PaymentMethod = 'stripe' | 'x402';

/**
 * Product interface for PaymentMethodBadge
 */
interface Product {
  hasStripeCoupon: boolean;
  hasCryptoCoupon: boolean;
  stripeDiscountPercent: number;
  cryptoDiscountPercent: number;
  stripeCouponCode?: string;
  cryptoCouponCode?: string;
}

/**
 * Props for PaymentMethodBadge component
 */
export interface PaymentMethodBadgeProps {
  /** Product data with coupon information */
  product: Product;
  /** Selected payment method */
  paymentMethod: PaymentMethod;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
}

/**
 * PaymentMethodBadge component for displaying payment-method-specific discount badges (React Native)
 *
 * Features:
 * - Shows badges like "3% off with crypto!" or "Save with card!"
 * - Color-coded by payment method (indigo for Stripe, emerald for crypto)
 * - Displays coupon code when available
 * - Returns null if no discount available
 *
 * Usage:
 * ```tsx
 * <PaymentMethodBadge
 *   product={productData}
 *   paymentMethod="x402"
 * />
 * ```
 */
export function PaymentMethodBadge({
  product,
  paymentMethod,
  style,
  textStyle,
}: PaymentMethodBadgeProps) {
  const theme = useCedrosTheme();

  const isStripe = paymentMethod === 'stripe';
  const hasDiscount = isStripe ? product.hasStripeCoupon : product.hasCryptoCoupon;
  const discountPercent = isStripe
    ? product.stripeDiscountPercent
    : product.cryptoDiscountPercent;
  const couponCode = isStripe ? product.stripeCouponCode : product.cryptoCouponCode;

  if (!hasDiscount || discountPercent === 0) {
    return null;
  }

  const badgeText = isStripe
    ? `${discountPercent}% off with card!`
    : `${discountPercent}% off with crypto!`;

  // Color schemes: indigo for Stripe, emerald for crypto
  const backgroundColor = isStripe ? '#6366f1' : '#10b981';

  return (
    <View
      style={[
        badgeStyles.container,
        { backgroundColor },
        style,
      ]}
    >
      <Text style={[badgeStyles.text, textStyle]}>
        {badgeText}
        {couponCode && (
          <Text style={badgeStyles.couponCode}> ({couponCode})</Text>
        )}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  couponCode: {
    opacity: 0.8,
    fontSize: 12,
    fontWeight: '400',
  },
});
