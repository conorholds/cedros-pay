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
exports.CartDrawer = CartDrawer;
exports.MiniCart = MiniCart;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../../config/context");
const CartProvider_1 = require("../../state/cart/CartProvider");
const CartPanel_1 = require("./CartPanel");
const button_1 = require("../ui/button");
const sheet_1 = require("../ui/sheet");
const tabs_1 = require("../ui/tabs");
function CartDrawer({ trigger, side = 'right', open, onOpenChange, onCheckout, preferredTab, style, chatComponent, }) {
    // Hooks are required by React Native rules of hooks, even if not directly used
    (0, context_1.useCedrosShop)();
    (0, CartProvider_1.useCart)();
    const [activeTab, setActiveTab] = React.useState(preferredTab ?? 'cart');
    React.useEffect(() => {
        if (!open)
            return;
        setActiveTab(preferredTab ?? 'cart');
    }, [open, preferredTab]);
    const handleCheckout = () => {
        onCheckout();
        onOpenChange?.(false);
    };
    return (<sheet_1.Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && (<sheet_1.SheetTrigger>
          {trigger}
        </sheet_1.SheetTrigger>)}
      <sheet_1.SheetContent side={side} style={[styles.sheetContent, style]}>
        <sheet_1.SheetHeader style={styles.sheetHeader}>
          <react_native_1.View style={styles.headerRow}>
            <react_native_1.View style={styles.tabsContainer}>
              <tabs_1.Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
                <tabs_1.TabsList style={styles.tabsList}>
                  <tabs_1.TabsTrigger value="cart" style={styles.tabTrigger}>
                    Cart
                  </tabs_1.TabsTrigger>
                  <tabs_1.TabsTrigger value="chat" style={styles.tabTrigger}>
                    Chat
                  </tabs_1.TabsTrigger>
                </tabs_1.TabsList>
              </tabs_1.Tabs>
            </react_native_1.View>
            <sheet_1.SheetClose>
              <button_1.Button variant="ghost" size="sm" style={styles.closeButton}>
                ✕
              </button_1.Button>
            </sheet_1.SheetClose>
          </react_native_1.View>
        </sheet_1.SheetHeader>

        <react_native_1.View style={styles.content}>
          {activeTab === 'chat' && chatComponent ? (<react_native_1.View style={styles.chatContainer}>
              {chatComponent}
            </react_native_1.View>) : (<CartPanel_1.CartPanel onCheckout={handleCheckout} style={styles.cartPanel}/>)}
        </react_native_1.View>
      </sheet_1.SheetContent>
    </sheet_1.Sheet>);
}
function MiniCart({ onPress, style }) {
    const { config } = (0, context_1.useCedrosShop)();
    const cart = (0, CartProvider_1.useCart)();
    if (cart.items.length === 0) {
        return null;
    }
    return (<react_native_1.TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.miniCartContainer, style]}>
      <react_native_1.View style={styles.miniCartRow}>
        <react_native_1.Text style={styles.miniCartIcon}>🛒</react_native_1.Text>
        <react_native_1.Text style={styles.miniCartCount}>{cart.count}</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.Text style={styles.miniCartTotal}>
        {new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: config.currency,
        }).format(cart.subtotal)}
      </react_native_1.Text>
    </react_native_1.TouchableOpacity>);
}
const styles = react_native_1.StyleSheet.create({
    sheetContent: {
        padding: 0,
    },
    sheetHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tabsContainer: {
        flex: 1,
    },
    tabsList: {
        alignSelf: 'flex-start',
    },
    tabTrigger: {
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    closeButton: {
        width: 36,
        height: 36,
        padding: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    chatContainer: {
        flex: 1,
        padding: 16,
    },
    cartPanel: {
        borderWidth: 0,
        borderRadius: 0,
    },
    // MiniCart styles
    miniCartContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#171717',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    miniCartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    miniCartIcon: {
        fontSize: 18,
    },
    miniCartCount: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    miniCartTotal: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },
});
//# sourceMappingURL=CartDrawer.js.map