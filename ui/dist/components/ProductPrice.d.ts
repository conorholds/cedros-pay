import { default as React } from 'react';
import { Product } from '../types';
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
    showOriginalPrice?: boolean;
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
export declare function ProductPrice({ product, paymentMethod, showOriginalPrice, className, style, }: ProductPriceProps): import("react/jsx-runtime").JSX.Element;
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
export declare function PaymentMethodBadge({ product, paymentMethod, className, style, }: PaymentMethodBadgeProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=ProductPrice.d.ts.map