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
exports.CartTemplate = CartTemplate;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../config/context");
const CartPageContent_1 = require("../components/cart/CartPageContent");
const useStorefrontSettings_1 = require("../hooks/useStorefrontSettings");
function CartTemplate({ style, onCheckout, }) {
    const { config } = (0, context_1.useCedrosShop)();
    const { settings: storefrontSettings } = (0, useStorefrontSettings_1.useStorefrontSettings)();
    // Show promo codes only if both code-level config AND storefront settings allow it
    const showPromoCodes = config.checkout.allowPromoCodes && storefrontSettings.checkout.promoCodes;
    const handleCheckout = () => {
        if (onCheckout) {
            onCheckout();
        }
    };
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <react_native_1.Text style={styles.title}>Cart</react_native_1.Text>
        <react_native_1.Text style={styles.subtitle}>
          Review items, adjust quantities, then check out.
        </react_native_1.Text>
        <react_native_1.View style={styles.contentWrapper}>
          <CartPageContent_1.CartPageContent onCheckout={handleCheckout} showPromoCode={showPromoCodes}/>
        </react_native_1.View>
      </react_native_1.ScrollView>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 32,
        paddingBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        color: '#171717',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#737373',
        marginTop: 8,
    },
    contentWrapper: {
        marginTop: 24,
    },
});
//# sourceMappingURL=CartTemplate.js.map