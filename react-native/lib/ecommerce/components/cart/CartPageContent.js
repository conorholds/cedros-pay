"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartPageContent = CartPageContent;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../../config/context");
const CartProvider_1 = require("../../state/cart/CartProvider");
const useCartInventory_1 = require("../../hooks/useCartInventory");
const CartLineItem_1 = require("./CartLineItem");
const CartSummary_1 = require("./CartSummary");
const CartEmpty_1 = require("./CartEmpty");
const PromoCodeInput_1 = require("./PromoCodeInput");
const separator_1 = require("../ui/separator");
function CartPageContent({ onCheckout, showPromoCode, style, }) {
    const { config } = (0, context_1.useCedrosShop)();
    const cart = (0, CartProvider_1.useCart)();
    const { getItemInventory, hasIssues } = (0, useCartInventory_1.useCartInventory)({
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
        return (<CartEmpty_1.CartEmpty title="Your cart is empty" description="Add a few products and come back here when you're ready to check out." style={style}/>);
    }
    return (<react_native_1.View style={[styles.container, style]}>
      {/* Items List */}
      <react_native_1.View style={styles.itemsSection}>
        {/* Table Header (hidden on small screens) */}
        <react_native_1.View style={styles.tableHeader}>
          <react_native_1.View style={styles.headerImage}/>
          <react_native_1.Text style={styles.headerText}>Item</react_native_1.Text>
          <react_native_1.Text style={[styles.headerText, styles.headerCenter]}>Qty</react_native_1.Text>
          <react_native_1.Text style={[styles.headerText, styles.headerCenter]}>Total</react_native_1.Text>
        </react_native_1.View>

        <react_native_1.ScrollView showsVerticalScrollIndicator={false}>
          {cart.items.map((item) => (<react_native_1.View key={`${item.productId}::${item.variantId ?? ''}`} style={styles.itemRow}>
              <CartLineItem_1.CartLineItem item={item} onRemove={() => cart.removeItem(item.productId, item.variantId)} onSetQty={(qty) => cart.setQty(item.productId, item.variantId, qty)} inventory={getItemInventory(item.productId, item.variantId)}/>
            </react_native_1.View>))}
        </react_native_1.ScrollView>
      </react_native_1.View>

      {/* Summary Section */}
      <react_native_1.View style={styles.summarySection}>
        <react_native_1.Text style={styles.summaryTitle}>Summary</react_native_1.Text>
        <separator_1.Separator style={styles.summarySeparator}/>
        
        <react_native_1.View style={styles.summaryContent}>
          {showPromoCode && (<PromoCodeInput_1.PromoCodeInput value={cart.promoCode} onApply={cart.setPromoCode} style={styles.promoCode}/>)}
          <CartSummary_1.CartSummary currency={config.currency} subtotal={cart.subtotal} onCheckout={onCheckout} isCheckoutDisabled={cart.items.length === 0 || hasIssues} checkoutDisabledReason={hasIssues ? 'Some items have inventory issues' : undefined} onRemoveUnavailable={hasIssues ? handleRemoveUnavailable : undefined}/>
        </react_native_1.View>
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=CartPageContent.js.map