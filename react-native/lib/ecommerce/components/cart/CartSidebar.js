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
exports.CartSidebar = CartSidebar;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../../config/context");
const CartProvider_1 = require("../../state/cart/CartProvider");
const CartPanel_1 = require("./CartPanel");
const button_1 = require("../ui/button");
const sheet_1 = require("../ui/sheet");
const tabs_1 = require("../ui/tabs");
function CartSidebar({ trigger, side = 'right', open, onOpenChange, onCheckout, preferredTab, style, chatComponent, }) {
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
              <react_native_1.Text style={styles.chatDescription}>
                Get help finding a product or ask us any questions. We're both your shopping assistant and support chat.
              </react_native_1.Text>
              <react_native_1.View style={styles.chatContent}>
                {chatComponent}
              </react_native_1.View>
            </react_native_1.View>) : (<CartPanel_1.CartPanel onCheckout={handleCheckout} style={styles.cartPanel}/>)}
        </react_native_1.View>
      </sheet_1.SheetContent>
    </sheet_1.Sheet>);
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
        marginTop: 12,
    },
    chatContainer: {
        flex: 1,
        padding: 16,
    },
    chatDescription: {
        fontSize: 14,
        color: '#525252',
    },
    chatContent: {
        flex: 1,
        marginTop: 12,
    },
    cartPanel: {
        borderWidth: 0,
        borderRadius: 0,
        padding: 0,
    },
});
//# sourceMappingURL=CartSidebar.js.map