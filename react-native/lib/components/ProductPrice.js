"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductPrice = ProductPrice;
exports.PaymentMethodBadge = PaymentMethodBadge;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../context");
/**
 * Format amount for display
 * @param amount - Amount in cents or atomic units
 * @param currency - Currency code
 * @returns Formatted amount string
 */
function formatAmount(amount, currency) {
    // Handle crypto tokens (USDC, USDT, etc.)
    if (['USDC', 'USDT', 'PYUSD', 'CASH'].includes(currency.toUpperCase())) {
        // Convert from atomic units (6 decimals for SPL tokens)
        const formatted = (amount / 1000000).toFixed(2);
        return `${formatted} ${currency.toUpperCase()}`;
    }
    // Handle fiat currencies
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount / 100);
    }
    catch {
        // Fallback if currency code is invalid
        return `$${(amount / 100).toFixed(2)} ${currency}`;
    }
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
function ProductPrice({ amount, currency, originalAmount, size = 'medium', style, priceStyle, originalPriceStyle, }) {
    const theme = (0, context_1.useCedrosTheme)();
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
    return (<react_native_1.View style={[styles.container, style]}>
      {hasDiscount && (<react_native_1.Text style={[
                styles.originalPrice,
                {
                    fontSize: getOriginalFontSize(),
                    color: theme.tokens?.surfaceText || '#6b7280',
                },
                originalPriceStyle,
            ]}>
          {formatAmount(originalAmount, currency)}
        </react_native_1.Text>)}
      <react_native_1.Text style={[
            styles.price,
            {
                fontSize: getFontSize(),
                color: theme.tokens?.surfaceText || '#111827',
            },
            priceStyle,
        ]}>
        {formattedPrice}
      </react_native_1.Text>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
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
function PaymentMethodBadge({ product, paymentMethod, style, textStyle, }) {
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
    return (<react_native_1.View style={[
            badgeStyles.container,
            { backgroundColor },
            style,
        ]}>
      <react_native_1.Text style={[badgeStyles.text, textStyle]}>
        {badgeText}
        {couponCode && (<react_native_1.Text style={badgeStyles.couponCode}> ({couponCode})</react_native_1.Text>)}
      </react_native_1.Text>
    </react_native_1.View>);
}
const badgeStyles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=ProductPrice.js.map