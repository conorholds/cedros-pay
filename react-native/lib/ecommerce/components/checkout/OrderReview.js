"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderReview = OrderReview;
const react_native_1 = require("react-native");
const context_1 = require("../../config/context");
const CartProvider_1 = require("../../state/cart/CartProvider");
const useCheckout_1 = require("../../state/checkout/useCheckout");
const useStorefrontSettings_1 = require("../../hooks/useStorefrontSettings");
const money_1 = require("../../utils/money");
const separator_1 = require("../ui/separator");
const PromoCodeInput_1 = require("../cart/PromoCodeInput");
function OrderReview({ style }) {
    const { config } = (0, context_1.useCedrosShop)();
    const cart = (0, CartProvider_1.useCart)();
    const checkout = (0, useCheckout_1.useCheckout)();
    const { settings: storefrontSettings } = (0, useStorefrontSettings_1.useStorefrontSettings)();
    // Show promo codes only if both code-level config AND storefront settings allow it
    const showPromoCodes = (config.checkout.allowPromoCodes ?? false) && storefrontSettings.checkout.promoCodes;
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.Text style={styles.title}>Order review</react_native_1.Text>
      <separator_1.Separator style={styles.separator}/>
      
      <react_native_1.View style={styles.itemsContainer}>
        {cart.items.map((it) => (<react_native_1.View key={`${it.productId}::${it.variantId ?? ''}`} style={styles.itemRow}>
            <react_native_1.View style={styles.itemLeft}>
              <react_native_1.View style={styles.itemImageContainer}>
                {it.imageSnapshot ? (<react_native_1.Image source={{ uri: it.imageSnapshot }} style={styles.itemImage}/>) : (<react_native_1.View style={styles.itemImagePlaceholder}/>)}
              </react_native_1.View>
              <react_native_1.View style={styles.itemInfo}>
                <react_native_1.Text style={styles.itemTitle} numberOfLines={1}>
                  {it.titleSnapshot}
                </react_native_1.Text>
                <react_native_1.Text style={styles.itemQty}>Qty {it.qty}</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.View>
            <react_native_1.Text style={styles.itemPrice}>
              {(0, money_1.formatMoney)({ amount: it.unitPrice * it.qty, currency: it.currency })}
            </react_native_1.Text>
          </react_native_1.View>))}
      </react_native_1.View>
      
      <separator_1.Separator style={styles.separator}/>

      {showPromoCodes ? (<>
          <PromoCodeInput_1.PromoCodeInput value={checkout.values.discountCode ?? cart.promoCode} onApply={(code) => {
                checkout.setField('discountCode', code ?? '');
                cart.setPromoCode(code);
            }}/>
          <separator_1.Separator style={styles.separator}/>
        </>) : null}

      <react_native_1.View style={styles.subtotalRow}>
        <react_native_1.Text style={styles.subtotalLabel}>Subtotal</react_native_1.Text>
        <react_native_1.Text style={styles.subtotalValue}>
          {(0, money_1.formatMoney)({ amount: cart.subtotal, currency: config.currency })}
        </react_native_1.Text>
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=OrderReview.js.map