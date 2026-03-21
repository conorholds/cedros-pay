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
exports.CheckoutTemplate = CheckoutTemplate;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../config/context");
const CartProvider_1 = require("../state/cart/CartProvider");
const useCheckoutResultFromUrl_1 = require("../hooks/useCheckoutResultFromUrl");
const CheckoutLayout_1 = require("../components/checkout/CheckoutLayout");
const CheckoutForm_1 = require("../components/checkout/CheckoutForm");
const OrderReview_1 = require("../components/checkout/OrderReview");
const PaymentStep_1 = require("../components/checkout/PaymentStep");
const CheckoutReceipt_1 = require("../components/checkout/CheckoutReceipt");
const separator_1 = require("../components/ui/separator");
const card_1 = require("../components/ui/card");
const useCheckout_1 = require("../state/checkout/useCheckout");
const button_1 = require("../components/ui/button");
function CheckoutTemplate({ style, onContinueShopping, onViewOrders, onLogin, currentUrl, }) {
    const { config } = (0, context_1.useCedrosShop)();
    const cart = (0, CartProvider_1.useCart)();
    const result = (0, useCheckoutResultFromUrl_1.useCheckoutResultFromUrl)({ url: currentUrl });
    const isSignedIn = config.customer?.isSignedIn ?? Boolean(config.customer?.id);
    const allowGuestCheckout = config.checkout.requireAccount ? false : (config.checkout.guestCheckout ?? true);
    const shouldBlockForAuth = !allowGuestCheckout && !isSignedIn;
    React.useEffect(() => {
        if (result.kind === 'success') {
            cart.clear();
        }
        // only on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result.kind]);
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <CheckoutReceipt_1.CheckoutReceipt result={result} onContinueShopping={onContinueShopping} onViewOrders={onViewOrders}/>

        {result.kind === 'idle' ? (<react_native_1.View style={styles.checkoutContent}>
            <react_native_1.View style={styles.header}>
              <react_native_1.Text style={styles.title}>Checkout</react_native_1.Text>
              <react_native_1.Text style={styles.subtitle}>
                {config.checkout.mode === 'none'
                ? 'Confirm and pay.'
                : 'Enter details, then complete payment.'}
              </react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={styles.formContainer}>
              <useCheckout_1.CheckoutProvider>
                {shouldBlockForAuth ? (<card_1.Card style={styles.authCard}>
                    <card_1.CardHeader>
                      <card_1.CardTitle style={styles.authTitle}>Sign in required</card_1.CardTitle>
                    </card_1.CardHeader>
                    <card_1.CardContent>
                      <react_native_1.Text style={styles.authText}>
                        This store requires an account to complete checkout.
                      </react_native_1.Text>
                      {onLogin ? (<react_native_1.View style={styles.authButton}>
                          <button_1.Button onPress={onLogin}>
                            Sign in
                          </button_1.Button>
                        </react_native_1.View>) : null}
                    </card_1.CardContent>
                  </card_1.Card>) : (<CheckoutLayout_1.CheckoutLayout left={<react_native_1.View style={styles.leftColumn}>
                        <CheckoutForm_1.CheckoutForm />
                        <card_1.Card style={styles.paymentCard}>
                          <card_1.CardHeader>
                            <card_1.CardTitle style={styles.paymentTitle}>Payment</card_1.CardTitle>
                          </card_1.CardHeader>
                          <card_1.CardContent>
                            <separator_1.Separator style={styles.separator}/>
                            <PaymentStep_1.PaymentStep />
                          </card_1.CardContent>
                        </card_1.Card>
                      </react_native_1.View>} right={<react_native_1.View style={styles.rightColumn}>
                        <OrderReview_1.OrderReview />
                      </react_native_1.View>}/>)}
              </useCheckout_1.CheckoutProvider>
            </react_native_1.View>
          </react_native_1.View>) : null}
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
    checkoutContent: {
        gap: 24,
    },
    header: {
        marginBottom: 8,
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
    formContainer: {
        marginTop: 8,
    },
    authCard: {
        borderRadius: 12,
    },
    authTitle: {
        fontSize: 16,
    },
    authText: {
        fontSize: 14,
        color: '#737373',
    },
    authButton: {
        marginTop: 16,
    },
    leftColumn: {
        gap: 16,
    },
    paymentCard: {
        borderRadius: 12,
    },
    paymentTitle: {
        fontSize: 16,
    },
    separator: {
        marginBottom: 16,
    },
    rightColumn: {
        marginTop: 16,
    },
});
//# sourceMappingURL=CheckoutTemplate.js.map