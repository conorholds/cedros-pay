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
exports.CheckoutSuccess = CheckoutSuccess;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const useCheckoutResultFromUrl_1 = require("../../hooks/useCheckoutResultFromUrl");
const CheckoutReceipt_1 = require("./CheckoutReceipt");
/**
 * Checkout Success Component
 *
 * Displays the result of a successful checkout with order details.
 * Reads the checkout result from URL params and displays order details.
 */
function CheckoutSuccess({ onContinueShopping, onViewOrders, style, receiptStyle, currentUrl, }) {
    const result = (0, useCheckoutResultFromUrl_1.useCheckoutResultFromUrl)({ url: currentUrl });
    // Show loading state while resolving
    if (result.kind === 'idle') {
        return (<react_native_1.View style={[styles.container, styles.loadingContainer, style]}>
        <react_native_1.Text style={styles.loadingText}>Loading order details...</react_native_1.Text>
      </react_native_1.View>);
    }
    return (<react_native_1.ScrollView style={[styles.container, style]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <CheckoutReceipt_1.CheckoutReceipt result={result} onContinueShopping={onContinueShopping} onViewOrders={onViewOrders} style={receiptStyle}/>
    </react_native_1.ScrollView>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 16,
    },
    loadingContainer: {
        minHeight: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#737373',
    },
});
//# sourceMappingURL=CheckoutSuccess.js.map