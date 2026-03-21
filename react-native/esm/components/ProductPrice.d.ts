import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
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
export declare function ProductPrice({ amount, currency, originalAmount, size, style, priceStyle, originalPriceStyle, }: ProductPriceProps): React.JSX.Element;
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
export declare function PaymentMethodBadge({ product, paymentMethod, style, textStyle, }: PaymentMethodBadgeProps): React.JSX.Element | null;
export {};
//# sourceMappingURL=ProductPrice.d.ts.map