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
exports.CartCountBadge = CartCountBadge;
exports.MiniCart = MiniCart;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const CartProvider_1 = require("../../state/cart/CartProvider");
const money_1 = require("../../utils/money");
function CartCountBadge({ onPress, style, badgeStyle, }) {
    const cart = (0, CartProvider_1.useCart)();
    const count = cart.count;
    if (count === 0) {
        return null;
    }
    return (<react_native_1.TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.container, style]}>
      <react_native_1.Text style={styles.cartIcon}>🛒</react_native_1.Text>
      <react_native_1.View style={[styles.badge, badgeStyle]}>
        <react_native_1.Text style={styles.badgeText}>{count > 99 ? '99+' : count}</react_native_1.Text>
      </react_native_1.View>
    </react_native_1.TouchableOpacity>);
}
function MiniCart({ onPress, showTotal = true, style, }) {
    const cart = (0, CartProvider_1.useCart)();
    if (cart.items.length === 0) {
        return null;
    }
    return (<react_native_1.TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.miniCartContainer, style]}>
      <react_native_1.View style={styles.miniCartContent}>
        <react_native_1.Text style={styles.miniCartIcon}>🛒</react_native_1.Text>
        <react_native_1.View style={styles.miniCartInfo}>
          <react_native_1.Text style={styles.miniCartCount}>
            {cart.count} item{cart.count === 1 ? '' : 's'}
          </react_native_1.Text>
          {showTotal && (<react_native_1.Text style={styles.miniCartTotal}>
              {(0, money_1.formatMoney)({ amount: cart.subtotal, currency: cart.items[0]?.currency || 'USD' })}
            </react_native_1.Text>)}
        </react_native_1.View>
      </react_native_1.View>
      <react_native_1.Text style={styles.miniCartArrow}>→</react_native_1.Text>
    </react_native_1.TouchableOpacity>);
}
const styles = react_native_1.StyleSheet.create({
    // CartCountBadge styles
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    cartIcon: {
        fontSize: 24,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#dc2626',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '600',
    },
    // MiniCart styles
    miniCartContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#171717',
        borderRadius: 12,
        padding: 12,
    },
    miniCartContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    miniCartIcon: {
        fontSize: 20,
    },
    miniCartInfo: {
        gap: 2,
    },
    miniCartCount: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '500',
    },
    miniCartTotal: {
        color: '#a3a3a3',
        fontSize: 12,
    },
    miniCartArrow: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
//# sourceMappingURL=CartCountBadge.js.map