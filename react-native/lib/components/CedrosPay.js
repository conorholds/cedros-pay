"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CedrosPay = CedrosPay;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const StripeButton_1 = require("./StripeButton");
const CryptoButton_1 = require("./CryptoButton");
const CreditsButton_1 = require("./CreditsButton");
const PurchaseButton_1 = require("./PurchaseButton");
const context_1 = require("../context");
const context_2 = require("../context");
const usePaymentMode_1 = require("../hooks/usePaymentMode");
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("../utils/logger");
const cartHelpers_1 = require("../utils/cartHelpers");
function CedrosPay(props) {
    const { resource, items, checkout = {}, display = {}, callbacks = {}, advanced = {}, style } = props;
    const { config, walletPool } = (0, context_1.useCedrosContext)();
    const theme = (0, context_2.useCedrosTheme)();
    const { isCartMode } = (0, usePaymentMode_1.usePaymentMode)(resource, items);
    // Memoize cart item count to avoid recalculating on every render
    const cartItemCount = react_1.default.useMemo(() => (items ? (0, cartHelpers_1.getCartItemCount)(items) : 0), [items]);
    // CRITICAL FIX: Memoize callback wrappers to prevent infinite loops
    const handleStripeSuccess = react_1.default.useMemo(() => callbacks.onPaymentSuccess
        ? (txId) => callbacks.onPaymentSuccess({ transactionId: txId, method: 'stripe' })
        : undefined, [callbacks.onPaymentSuccess]);
    const handleCryptoSuccess = react_1.default.useMemo(() => callbacks.onPaymentSuccess
        ? (txId) => callbacks.onPaymentSuccess({ transactionId: txId, method: 'crypto' })
        : undefined, [callbacks.onPaymentSuccess]);
    const handleStripeError = react_1.default.useMemo(() => callbacks.onPaymentError
        ? (error) => callbacks.onPaymentError({ message: error, method: 'stripe' })
        : undefined, [callbacks.onPaymentError]);
    const handleCryptoError = react_1.default.useMemo(() => callbacks.onPaymentError
        ? (error) => callbacks.onPaymentError({ message: error, method: 'crypto' })
        : undefined, [callbacks.onPaymentError]);
    const handleCreditsSuccess = react_1.default.useMemo(() => callbacks.onPaymentSuccess
        ? (txId) => callbacks.onPaymentSuccess({ transactionId: txId, method: 'credits' })
        : undefined, [callbacks.onPaymentSuccess]);
    const handleCreditsError = react_1.default.useMemo(() => callbacks.onPaymentError
        ? (error) => callbacks.onPaymentError({ message: error, method: 'credits' })
        : undefined, [callbacks.onPaymentError]);
    const handleCreditsAttempt = react_1.default.useMemo(() => (callbacks.onPaymentAttempt ? () => callbacks.onPaymentAttempt('credits') : undefined), [callbacks.onPaymentAttempt]);
    const endpoint = config.solanaEndpoint ?? (0, web3_js_1.clusterApiUrl)(config.solanaCluster);
    // Memoize wallets array to prevent WalletProvider re-initialization
    const wallets = react_1.default.useMemo(() => (advanced.wallets && advanced.wallets.length > 0 ? advanced.wallets : walletPool.getAdapters()), [advanced.wallets, walletPool]);
    // Validate input (after all hooks)
    if (!resource && (!items || items.length === 0)) {
        (0, logger_1.getLogger)().error('CedrosPay: Must provide either "resource" or "items" prop');
        return (<react_native_1.View style={style}>
        <react_native_1.Text style={{ color: theme.tokens?.errorText || '#ef4444' }}>
          Configuration error: No resource or items provided
        </react_native_1.Text>
      </react_native_1.View>);
    }
    // Extract final values with defaults
    const showCard = display.showCard ?? true;
    const showCrypto = display.showCrypto ?? true;
    const showCredits = display.showCredits ?? false;
    const showPurchaseButton = display.showPurchaseButton ?? false;
    const layout = display.layout ?? 'vertical';
    const hideMessages = display.hideMessages ?? false;
    const autoDetectWallets = advanced.autoDetectWallets ?? true;
    const content = (<react_native_1.View style={[styles.content, layout === 'horizontal' && styles.horizontalLayout]}>
      {showPurchaseButton ? (<PurchaseButton_1.PurchaseButton resource={isCartMode ? undefined : resource || items?.[0]?.resource} items={isCartMode ? items : undefined} label={display.purchaseLabel} cardLabel={display.cardLabel} cryptoLabel={display.cryptoLabel} showCard={showCard} showCrypto={showCrypto} onPaymentAttempt={callbacks.onPaymentAttempt} onPaymentSuccess={handleStripeSuccess} onPaymentError={handleStripeError} onStripeSuccess={handleStripeSuccess} onCryptoSuccess={handleCryptoSuccess} onStripeError={handleStripeError} onCryptoError={handleCryptoError} customerEmail={checkout.customerEmail} successUrl={checkout.successUrl} cancelUrl={checkout.cancelUrl} metadata={checkout.metadata} couponCode={checkout.couponCode} autoDetectWallets={autoDetectWallets} hideMessages={hideMessages} renderModal={display.renderModal}/>) : (<>
          {showCard && (<react_native_1.View style={styles.buttonWrapper}>
              <StripeButton_1.StripeButton resource={isCartMode ? undefined : resource || items?.[0]?.resource} items={isCartMode ? items : undefined} customerEmail={checkout.customerEmail} successUrl={checkout.successUrl} cancelUrl={checkout.cancelUrl} metadata={checkout.metadata} couponCode={checkout.couponCode} label={display.cardLabel} onAttempt={callbacks.onPaymentAttempt} onSuccess={handleStripeSuccess} onError={handleStripeError}/>
            </react_native_1.View>)}
          {showCrypto && (<react_native_1.View style={styles.buttonWrapper}>
              <CryptoButton_1.CryptoButton resource={isCartMode ? undefined : resource || items?.[0]?.resource} items={isCartMode ? items : undefined} metadata={checkout.metadata} couponCode={checkout.couponCode} label={display.cryptoLabel} onAttempt={callbacks.onPaymentAttempt} onSuccess={handleCryptoSuccess} onError={handleCryptoError} hideMessages={hideMessages}/>
            </react_native_1.View>)}
          {showCredits && (<react_native_1.View style={styles.buttonWrapper}>
              <CreditsButton_1.CreditsButton resource={isCartMode ? undefined : resource || items?.[0]?.resource} items={isCartMode ? items : undefined} authToken={checkout.authToken} metadata={checkout.metadata} couponCode={checkout.couponCode} label={display.creditsLabel} onAttempt={handleCreditsAttempt} onSuccess={handleCreditsSuccess} onError={handleCreditsError}/>
            </react_native_1.View>)}
        </>)}
      {isCartMode && items && items.length > 1 && !hideMessages && (<react_native_1.Text style={[styles.cartNotification, { color: theme.tokens?.surfaceText || '#6b7280' }]}>
          Checking out {cartItemCount} items
        </react_native_1.Text>)}
    </react_native_1.View>);
    return (<react_native_1.View style={[styles.container, style]}>
      <wallet_adapter_react_1.ConnectionProvider endpoint={endpoint}>
        <wallet_adapter_react_1.WalletProvider wallets={wallets} autoConnect={false}>
          {content}
        </wallet_adapter_react_1.WalletProvider>
      </wallet_adapter_react_1.ConnectionProvider>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        width: '100%',
    },
    content: {
        width: '100%',
        gap: 12,
    },
    horizontalLayout: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    buttonWrapper: {
        flex: 1,
        minWidth: 150,
    },
    cartNotification: {
        marginTop: 8,
        fontSize: 14,
        opacity: 0.7,
        textAlign: 'center',
    },
});
//# sourceMappingURL=CedrosPay.js.map