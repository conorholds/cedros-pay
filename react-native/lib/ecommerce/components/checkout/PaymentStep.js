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
exports.PaymentStep = PaymentStep;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../../config/context");
const CartProvider_1 = require("../../state/cart/CartProvider");
const useCheckout_1 = require("../../state/checkout/useCheckout");
const useInventoryVerification_1 = require("../../hooks/useInventoryVerification");
const usePaymentMethodsConfig_1 = require("../../hooks/usePaymentMethodsConfig");
const walletDetection_1 = require("../../../utils/walletDetection");
const button_1 = require("../ui/button");
const tabs_1 = require("../ui/tabs");
const InventoryVerificationDialog_1 = require("./InventoryVerificationDialog");
function PaymentStep({ style, ctaLabel, renderEmbedded, embeddedFallback, renderCustom, customFallback, }) {
    const { config } = (0, context_1.useCedrosShop)();
    const cart = (0, CartProvider_1.useCart)();
    const checkout = (0, useCheckout_1.useCheckout)();
    // Fetch enabled payment methods from admin config
    const { config: paymentMethodsEnabled, isLoading: isLoadingPaymentConfig } = (0, usePaymentMethodsConfig_1.usePaymentMethodsConfig)();
    const [hasSolanaWallet, setHasSolanaWallet] = React.useState(false);
    React.useEffect(() => {
        setHasSolanaWallet((0, walletDetection_1.detectSolanaWallets)());
    }, []);
    // Inventory verification
    const inventoryVerification = (0, useInventoryVerification_1.useInventoryVerification)({ items: cart.items });
    const [showInventoryDialog, setShowInventoryDialog] = React.useState(false);
    const methods = React.useMemo(() => config.checkout.paymentMethods && config.checkout.paymentMethods.length
        ? config.checkout.paymentMethods
        : [{ id: 'card', label: 'Card', ctaLabel: 'Pay now' }], [config.checkout.paymentMethods]);
    // Filter methods based on admin-enabled settings AND runtime conditions (wallet detection)
    const visibleMethods = React.useMemo(() => {
        const filtered = methods.filter((m) => {
            // Check admin-enabled settings
            if (m.id === 'card' && !paymentMethodsEnabled.card)
                return false;
            if (m.id === 'crypto' && !paymentMethodsEnabled.crypto)
                return false;
            if (m.id === 'credits' && !paymentMethodsEnabled.credits)
                return false;
            // Runtime condition: crypto requires wallet
            if (m.id === 'crypto' && !hasSolanaWallet)
                return false;
            return true;
        });
        return filtered;
    }, [hasSolanaWallet, methods, paymentMethodsEnabled]);
    const [methodId, setMethodId] = React.useState((visibleMethods[0] ?? methods[0]).id);
    React.useEffect(() => {
        if (!visibleMethods.length)
            return;
        if (visibleMethods.some((m) => m.id === methodId))
            return;
        setMethodId(visibleMethods[0].id);
    }, [methodId, visibleMethods]);
    React.useEffect(() => {
        checkout.reset();
        // We intentionally clear any previous session/error when switching methods.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [methodId]);
    const activeMethod = visibleMethods.find((m) => m.id === methodId) ?? methods.find((m) => m.id === methodId) ?? methods[0];
    const hintText = activeMethod.description ?? (methodId === 'crypto' ? 'Pay using a connected wallet.' : undefined);
    const isCryptoUnavailable = methodId === 'crypto' && !hasSolanaWallet;
    const isBusy = isLoadingPaymentConfig ||
        checkout.status === 'validating' ||
        checkout.status === 'creating_session' ||
        checkout.status === 'redirecting' ||
        inventoryVerification.isVerifying;
    const label = ctaLabel ??
        activeMethod.ctaLabel ??
        (config.checkout.mode === 'none' ? 'Continue to payment' : 'Pay now');
    // Handle checkout with inventory verification
    const handleCheckout = React.useCallback(async (paymentMethodId) => {
        // Verify inventory first
        const result = await inventoryVerification.verify();
        if (!result.ok && result.issues.length > 0) {
            // Show dialog with issues - user can fix and retry
            setShowInventoryDialog(true);
            return;
        }
        // Proceed with checkout
        void checkout.createCheckoutSession({ paymentMethodId });
    }, [checkout, inventoryVerification]);
    const embedded = checkout.session?.kind === 'embedded' ? checkout.session : null;
    const custom = checkout.session?.kind === 'custom' ? checkout.session : null;
    return (<react_native_1.View style={[styles.container, style]}>
      {visibleMethods.length > 1 ? (<react_native_1.View style={styles.paymentMethodContainer}>
          <react_native_1.Text style={styles.paymentMethodLabel}>Payment method</react_native_1.Text>
          <tabs_1.Tabs value={methodId} onValueChange={setMethodId}>
            <tabs_1.TabsList style={styles.tabsList}>
              {visibleMethods.map((m) => (<tabs_1.TabsTrigger key={m.id} value={m.id} style={styles.tabTrigger}>
                  {m.label}
                </tabs_1.TabsTrigger>))}
            </tabs_1.TabsList>
          </tabs_1.Tabs>
        </react_native_1.View>) : null}

      {checkout.error ? (<react_native_1.View style={styles.errorContainer}>
          <react_native_1.Text style={styles.errorText}>{checkout.error}</react_native_1.Text>
        </react_native_1.View>) : null}

      {custom ? (<react_native_1.View style={styles.sessionContainer}>
          {renderCustom ? (renderCustom(custom)) : (customFallback ?? (<react_native_1.View style={styles.fallbackContainer}>
                <react_native_1.Text style={styles.fallbackText}>
                  Checkout session created. Provide `renderCustom` to render a custom payment UI.
                </react_native_1.Text>
              </react_native_1.View>))}
        </react_native_1.View>) : embedded ? (<react_native_1.View style={styles.sessionContainer}>
          {renderEmbedded ? (renderEmbedded(embedded)) : (embeddedFallback ?? (<react_native_1.View style={styles.fallbackContainer}>
                <react_native_1.Text style={styles.fallbackText}>
                  Embedded checkout session created. Provide `renderEmbedded` to render your payment UI.
                </react_native_1.Text>
              </react_native_1.View>))}
        </react_native_1.View>) : (<button_1.Button style={styles.payButton} disabled={cart.items.length === 0 || isBusy || isCryptoUnavailable} loading={isBusy} onPress={() => {
                void handleCheckout(methodId);
            }}>
          {inventoryVerification.isVerifying ? 'Checking availability...' : isBusy ? 'Processing...' : label}
        </button_1.Button>)}

      {!embedded && !custom ? (<react_native_1.Text style={styles.hintText}>
          {isCryptoUnavailable
                ? 'Install a browser wallet to enable crypto payments.'
                : (hintText ?? 'You will be redirected to complete your payment.')}
        </react_native_1.Text>) : null}

      <InventoryVerificationDialog_1.InventoryVerificationDialog open={showInventoryDialog} onOpenChange={(open) => {
            setShowInventoryDialog(open);
            if (!open) {
                inventoryVerification.reset();
            }
        }} issues={inventoryVerification.result?.issues ?? []} onRemoveItem={(productId, variantId) => {
            cart.removeItem(productId, variantId);
        }} onUpdateQuantity={(productId, variantId, qty) => {
            cart.setQty(productId, variantId, qty);
        }}/>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        gap: 12,
    },
    paymentMethodContainer: {
        gap: 8,
    },
    paymentMethodLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: '#737373',
    },
    tabsList: {
        width: '100%',
    },
    tabTrigger: {
        flex: 1,
    },
    errorContainer: {
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#fecaca',
        padding: 12,
    },
    errorText: {
        fontSize: 14,
        color: '#991b1b',
    },
    sessionContainer: {
        gap: 12,
    },
    fallbackContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        padding: 16,
    },
    fallbackText: {
        fontSize: 14,
        color: '#737373',
    },
    payButton: {
        width: '100%',
    },
    hintText: {
        fontSize: 12,
        color: '#737373',
        textAlign: 'center',
    },
});
//# sourceMappingURL=PaymentStep.js.map