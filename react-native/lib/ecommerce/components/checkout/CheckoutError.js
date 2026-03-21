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
exports.CheckoutError = CheckoutError;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const button_1 = require("../ui/button");
const card_1 = require("../ui/card");
/**
 * Checkout Error Component
 *
 * Displays an error state when checkout fails.
 * Provides options to retry or go back to cart.
 */
function CheckoutError({ message = 'Something went wrong while processing your payment.', onRetry, onBackToCart, style, }) {
    return (<card_1.Card style={[styles.container, style]}>
      <card_1.CardContent>
        <react_native_1.View style={styles.iconContainer}>
          <react_native_1.Text style={styles.errorIcon}>!</react_native_1.Text>
        </react_native_1.View>
        
        <react_native_1.Text style={styles.title}>Payment failed</react_native_1.Text>
        <react_native_1.Text style={styles.message}>{message}</react_native_1.Text>

        <react_native_1.View style={styles.buttonContainer}>
          {onRetry ? (<button_1.Button onPress={onRetry}>
              Try again
            </button_1.Button>) : null}
          {onBackToCart ? (<button_1.Button variant="outline" onPress={onBackToCart}>
              Back to cart
            </button_1.Button>) : null}
        </react_native_1.View>
      </card_1.CardContent>
    </card_1.Card>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        width: '100%',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fef2f2',
        borderWidth: 2,
        borderColor: '#fecaca',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 20,
    },
    errorIcon: {
        fontSize: 32,
        fontWeight: '700',
        color: '#dc2626',
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#171717',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: '#737373',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    buttonContainer: {
        gap: 8,
    },
});
//# sourceMappingURL=CheckoutError.js.map