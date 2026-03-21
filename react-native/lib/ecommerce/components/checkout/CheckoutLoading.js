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
exports.CheckoutLoading = CheckoutLoading;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const card_1 = require("../ui/card");
/**
 * Checkout Loading Component
 *
 * Displays a loading state during checkout processing.
 */
function CheckoutLoading({ message = 'Processing your order...', style, }) {
    return (<card_1.Card style={[styles.container, style]}>
      <card_1.CardContent>
        <react_native_1.View style={styles.content}>
          <react_native_1.ActivityIndicator size="large" color="#171717" style={styles.spinner}/>
          <react_native_1.Text style={styles.message}>{message}</react_native_1.Text>
        </react_native_1.View>
      </card_1.CardContent>
    </card_1.Card>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        width: '100%',
    },
    content: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    spinner: {
        marginBottom: 16,
    },
    message: {
        fontSize: 16,
        color: '#737373',
        textAlign: 'center',
    },
});
//# sourceMappingURL=CheckoutLoading.js.map