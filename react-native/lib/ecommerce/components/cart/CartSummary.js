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
exports.CartSummary = CartSummary;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const money_1 = require("../../utils/money");
const button_1 = require("../ui/button");
const separator_1 = require("../ui/separator");
function CartSummary({ currency, subtotal, itemCount, onCheckout, isCheckoutDisabled, checkoutDisabledReason, onRemoveUnavailable, style, }) {
    return (<react_native_1.View style={[styles.container, style]}>
      <separator_1.Separator />
      
      <react_native_1.View style={styles.row}>
        <react_native_1.View style={styles.labelContainer}>
          <react_native_1.Text style={styles.label}>Subtotal</react_native_1.Text>
          {typeof itemCount === 'number' && (<>
              <react_native_1.Text style={styles.dot}>·</react_native_1.Text>
              <react_native_1.Text style={styles.itemCount}>
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </react_native_1.Text>
            </>)}
        </react_native_1.View>
        <react_native_1.Text style={styles.amount}>
          {(0, money_1.formatMoney)({ amount: subtotal, currency })}
        </react_native_1.Text>
      </react_native_1.View>

      <button_1.Button onPress={onCheckout} disabled={isCheckoutDisabled} style={styles.checkoutButton}>
        Checkout
      </button_1.Button>

      {isCheckoutDisabled && checkoutDisabledReason && (<react_native_1.View style={styles.warningContainer}>
          <react_native_1.Text style={styles.warningText}>{checkoutDisabledReason}</react_native_1.Text>
          {onRemoveUnavailable && (<react_native_1.TouchableOpacity onPress={onRemoveUnavailable}>
              <react_native_1.Text style={styles.removeUnavailableText}>
                Remove unavailable items
              </react_native_1.Text>
            </react_native_1.TouchableOpacity>)}
        </react_native_1.View>)}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        gap: 16,
        paddingTop: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    label: {
        fontSize: 14,
        color: '#525252',
    },
    dot: {
        fontSize: 14,
        color: '#d4d4d4',
    },
    itemCount: {
        fontSize: 14,
        color: '#525252',
    },
    amount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
    },
    checkoutButton: {
        width: '100%',
    },
    warningContainer: {
        gap: 8,
        alignItems: 'center',
    },
    warningText: {
        fontSize: 12,
        color: '#d97706',
        textAlign: 'center',
    },
    removeUnavailableText: {
        fontSize: 12,
        color: '#737373',
        textDecorationLine: 'underline',
    },
});
//# sourceMappingURL=CartSummary.js.map