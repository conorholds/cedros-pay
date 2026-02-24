import React from 'react';
import type { Product } from '../types';

/**
 * Payment method for price display
 */
export type PaymentMethod = 'stripe' | 'x402';

/**
 * Props for ProductPrice component
 */
interface ProductPriceProps {
  product: Product;
  paymentMethod: PaymentMethod;
  showOriginalPrice?: boolean;  // Show strikethrough if discounted
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Display product price based on selected payment method
 *
 * Shows the effective price (after auto-applied coupons) for the selected
 * payment method. Optionally shows original price with strikethrough if
 * a discount is applied.
 *
 * Usage:
 * ```tsx
 * <ProductPrice
 *   product={productData}
 *   paymentMethod="x402"
 *   showOriginalPrice={true}
 * />
 * ```
 */
export function ProductPrice({
  product,
  paymentMethod,
  showOriginalPrice = false,
  className = '',
  style = {},
}: ProductPriceProps) {
  const isStripe = paymentMethod === 'stripe';

  const originalPrice = isStripe ? product.fiatAmount : product.cryptoAmount;
  const effectivePrice = isStripe
    ? product.effectiveFiatAmount
    : product.effectiveCryptoAmount;

  const currency = isStripe ? product.fiatCurrency.toUpperCase() : product.cryptoToken;
  const hasDiscount = isStripe ? product.hasStripeCoupon : product.hasCryptoCoupon;
  const discountPercent = isStripe
    ? product.stripeDiscountPercent
    : product.cryptoDiscountPercent;

  return (
    <div className={className} style={style}>
      {showOriginalPrice && hasDiscount && (
        <span
          style={{
            textDecoration: 'line-through',
            opacity: 0.6,
            marginRight: '0.5rem',
            fontSize: '0.875em',
          }}
        >
          {originalPrice.toFixed(2)} {currency}
        </span>
      )}
      <span style={{ fontWeight: 600 }}>
        {effectivePrice.toFixed(2)} {currency}
      </span>
      {hasDiscount && discountPercent > 0 && (
        <span
          style={{
            marginLeft: '0.5rem',
            padding: '0.125rem 0.375rem',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '0.25rem',
            fontSize: '0.75em',
            fontWeight: 600,
          }}
        >
          {discountPercent}% OFF
        </span>
      )}
    </div>
  );
}

/**
 * Props for PaymentMethodBadge component
 */
interface PaymentMethodBadgeProps {
  product: Product;
  paymentMethod: PaymentMethod;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Display payment-method-specific discount badge
 *
 * Shows badges like "3% off with crypto!" or "Save with card!" based on
 * which payment method has active coupons.
 *
 * Usage:
 * ```tsx
 * <PaymentMethodBadge product={productData} paymentMethod="x402" />
 * ```
 */
export function PaymentMethodBadge({
  product,
  paymentMethod,
  className = '',
  style = {},
}: PaymentMethodBadgeProps) {
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

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.5rem 0.75rem',
        backgroundColor: isStripe ? '#6366f1' : '#10b981',
        color: 'white',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        fontWeight: 600,
        ...style,
      }}
    >
      {badgeText}
      {couponCode && (
        <span
          style={{
            marginLeft: '0.5rem',
            opacity: 0.8,
            fontSize: '0.75em',
            fontWeight: 400,
          }}
        >
          ({couponCode})
        </span>
      )}
    </div>
  );
}
