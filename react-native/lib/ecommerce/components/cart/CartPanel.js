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
exports.CartPanel = CartPanel;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../../config/context");
const CartProvider_1 = require("../../state/cart/CartProvider");
const useCartInventory_1 = require("../../hooks/useCartInventory");
const CartLineItem_1 = require("./CartLineItem");
const CartSummary_1 = require("./CartSummary");
const CartEmpty_1 = require("./CartEmpty");
const separator_1 = require("../ui/separator");
function CartPanel({ onCheckout, style, }) {
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
        return (<CartEmpty_1.CartEmpty title="Cart is empty" description="Add items from the catalog to check out." style={style}/>);
    }
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <react_native_1.View style={styles.itemsContainer}>
          {cart.items.map((item, index) => (<react_native_1.View key={`${item.productId}::${item.variantId ?? ''}`}>
              {index > 0 && <separator_1.Separator style={styles.itemSeparator}/>}
              <react_native_1.View style={styles.itemWrapper}>
                <CartLineItem_1.CartLineItem variant="compact" item={item} onRemove={() => cart.removeItem(item.productId, item.variantId)} onSetQty={(qty) => cart.setQty(item.productId, item.variantId, qty)} inventory={getItemInventory(item.productId, item.variantId)}/>
              </react_native_1.View>
            </react_native_1.View>))}
        </react_native_1.View>
      </react_native_1.ScrollView>

      <react_native_1.View style={styles.summaryContainer}>
        <separator_1.Separator />
        <CartSummary_1.CartSummary currency={config.currency} subtotal={cart.subtotal} itemCount={cart.count} onCheckout={onCheckout} isCheckoutDisabled={cart.items.length === 0 || hasIssues} checkoutDisabledReason={hasIssues ? 'Some items have inventory issues' : undefined} onRemoveUnavailable={hasIssues ? handleRemoveUnavailable : undefined}/>
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=CartPanel.js.map