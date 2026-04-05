"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CedrosPayButton = void 0;
exports.CedrosPay = CedrosPay;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const wallet_adapter_react_1 = require("@solana/wallet-adapter-react");
const StripeButton_1 = require("./StripeButton");
const CryptoButton_1 = require("./CryptoButton");
const CreditsButton_1 = require("./CreditsButton");
const NativeStoreButton_1 = require("./NativeStoreButton");
const RestorePurchasesButton_1 = require("./RestorePurchasesButton");
const ManageSubscriptionsButton_1 = require("./ManageSubscriptionsButton");
const PurchaseButton_1 = require("./PurchaseButton");
const context_1 = require("../context");
const context_2 = require("../context");
const usePaymentMode_1 = require("../hooks/usePaymentMode");
const useStoreAwarePaymentPolicy_1 = require("../hooks/useStoreAwarePaymentPolicy");
const resolveStoreProductConfiguration_1 = require("../policy/resolveStoreProductConfiguration");
const nativeStoreSupport_1 = require("../policy/nativeStoreSupport");
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("../utils/logger");
const cartHelpers_1 = require("../utils/cartHelpers");
function CedrosPay(props) {
    const { resource, items, product, fulfillmentType, policy, checkout = {}, display = {}, callbacks = {}, advanced = {}, style, } = props;
    const { config, walletPool } = (0, context_1.useCedrosContext)();
    const theme = (0, context_2.useCedrosTheme)();
    const { isCartMode } = (0, usePaymentMode_1.usePaymentMode)(resource, items);
    const singleResource = react_1.default.useMemo(() => product?.id ?? resource ?? (items?.length === 1 ? items[0].resource : undefined), [items, product, resource]);
    const catalogProduct = react_1.default.useMemo(() => {
        if (!singleResource) {
            return undefined;
        }
        return config.paymentPolicy?.productCatalog?.[singleResource];
    }, [config.paymentPolicy?.productCatalog, singleResource]);
    const normalizedProduct = react_1.default.useMemo(() => {
        return (0, resolveStoreProductConfiguration_1.mergeCedrosProductDefinition)({
            fallbackId: singleResource,
            fallbackFulfillmentType: fulfillmentType,
            catalogProduct,
            explicitProduct: product,
        });
    }, [catalogProduct, fulfillmentType, product, singleResource]);
    const storePolicy = (0, useStoreAwarePaymentPolicy_1.useStoreAwarePaymentPolicy)({
        product: normalizedProduct,
        policy,
        purchaseMode: isCartMode ? 'cart' : 'single',
    });
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
    const handleAppleIapSuccess = react_1.default.useMemo(() => callbacks.onPaymentSuccess
        ? (txId) => callbacks.onPaymentSuccess({
            transactionId: txId,
            method: 'apple_iap',
        })
        : undefined, [callbacks.onPaymentSuccess]);
    const handleAppleIapError = react_1.default.useMemo(() => callbacks.onPaymentError
        ? (error) => callbacks.onPaymentError({ message: error, method: 'apple_iap' })
        : undefined, [callbacks.onPaymentError]);
    const handleGooglePlaySuccess = react_1.default.useMemo(() => callbacks.onPaymentSuccess
        ? (txId) => callbacks.onPaymentSuccess({
            transactionId: txId,
            method: 'google_play_billing',
        })
        : undefined, [callbacks.onPaymentSuccess]);
    const handleGooglePlayError = react_1.default.useMemo(() => callbacks.onPaymentError
        ? (error) => callbacks.onPaymentError({
            message: error,
            method: 'google_play_billing',
        })
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
        if (!product) {
            (0, logger_1.getLogger)().error('CedrosPay: Must provide either "resource", "items", or "product" prop');
            return (<react_native_1.View style={style}>
          <react_native_1.Text style={{ color: theme.tokens?.errorText || '#ef4444' }}>
            Configuration error: No resource, items, or product provided
          </react_native_1.Text>
        </react_native_1.View>);
        }
    }
    const allowedMethods = storePolicy.renderableMethods;
    const showAppleIap = (storePolicy.usesOrchestration
        ? allowedMethods.includes('apple_iap')
        : false) && (display.showAppleIap ?? true);
    const showGooglePlayBilling = (storePolicy.usesOrchestration
        ? allowedMethods.includes('google_play_billing')
        : false) && (display.showGooglePlayBilling ?? true);
    const showCard = (storePolicy.usesOrchestration
        ? allowedMethods.includes('stripe')
        : display.showCard ?? true) && (display.showCard ?? true);
    const showCrypto = (storePolicy.usesOrchestration
        ? allowedMethods.includes('x402') || allowedMethods.includes('crypto')
        : display.showCrypto ?? true) && (display.showCrypto ?? true);
    const showCredits = (storePolicy.usesOrchestration
        ? allowedMethods.includes('credits')
        : display.showCredits ?? false) && (display.showCredits ?? false);
    const showPurchaseButton = display.showPurchaseButton ?? false;
    const layout = display.layout ?? 'vertical';
    const hideMessages = display.hideMessages ?? false;
    const autoDetectWallets = advanced.autoDetectWallets ?? true;
    const hasNativeStoreMethod = showAppleIap || showGooglePlayBilling;
    const nativeMethod = (0, nativeStoreSupport_1.resolveNativeStoreMethod)(storePolicy.resolution?.distributionChannel);
    const nativeHandler = nativeMethod
        ? config.paymentPolicy?.nativeHandlers?.[nativeMethod]
        : undefined;
    const canRestorePurchases = config.paymentPolicy?.storeBilling?.enabled !== false ||
        Boolean(nativeHandler?.restorePurchases);
    const canManageSubscriptions = config.paymentPolicy?.storeBilling?.enabled !== false ||
        Boolean(nativeHandler?.openManageSubscriptions);
    const showRestorePurchases = hasNativeStoreMethod &&
        canRestorePurchases &&
        Boolean(normalizedProduct) &&
        (display.showRestorePurchases ?? (0, nativeStoreSupport_1.isRestorableStoreProduct)(normalizedProduct));
    const showManageSubscriptions = hasNativeStoreMethod &&
        canManageSubscriptions &&
        Boolean(normalizedProduct) &&
        (display.showManageSubscriptions ??
            (0, nativeStoreSupport_1.isManageableStoreSubscription)(normalizedProduct));
    if (storePolicy.usesOrchestration && storePolicy.resolution?.failure) {
        (0, logger_1.getLogger)().error('CedrosPay: Unable to resolve a store-compliant payment method', storePolicy.resolution.failure);
        return (<react_native_1.View style={style}>
        <react_native_1.Text style={{ color: theme.tokens?.errorText || '#ef4444' }}>
          {storePolicy.resolution.failure.message}
        </react_native_1.Text>
      </react_native_1.View>);
    }
    const content = (<react_native_1.View style={[styles.content, layout === 'horizontal' && styles.horizontalLayout]}>
      {showPurchaseButton ? (<PurchaseButton_1.PurchaseButton resource={isCartMode ? undefined : singleResource} items={isCartMode ? items : undefined} product={normalizedProduct} distributionChannel={storePolicy.resolution?.distributionChannel} label={display.purchaseLabel} appleIapLabel={display.appleIapLabel} googlePlayBillingLabel={display.googlePlayBillingLabel} restorePurchasesLabel={display.restorePurchasesLabel} manageSubscriptionsLabel={display.manageSubscriptionsLabel} cardLabel={display.cardLabel} cryptoLabel={display.cryptoLabel} creditsLabel={display.creditsLabel} showAppleIap={showAppleIap} showGooglePlayBilling={showGooglePlayBilling} showRestorePurchases={showRestorePurchases} showManageSubscriptions={showManageSubscriptions} showCard={showCard} showCrypto={showCrypto} showCredits={showCredits} onPaymentAttempt={callbacks.onPaymentAttempt} onPaymentSuccess={handleStripeSuccess} onPaymentError={handleStripeError} onAppleIapSuccess={handleAppleIapSuccess} onGooglePlayBillingSuccess={handleGooglePlaySuccess} onStripeSuccess={handleStripeSuccess} onCryptoSuccess={handleCryptoSuccess} onCreditsSuccess={handleCreditsSuccess} onAppleIapError={handleAppleIapError} onGooglePlayBillingError={handleGooglePlayError} onStripeError={handleStripeError} onCryptoError={handleCryptoError} onCreditsError={handleCreditsError} customerEmail={checkout.customerEmail} successUrl={checkout.successUrl} cancelUrl={checkout.cancelUrl} metadata={checkout.metadata} couponCode={checkout.couponCode} autoDetectWallets={autoDetectWallets} hideMessages={hideMessages} renderModal={display.renderModal}/>) : (<>
          {showAppleIap &&
                normalizedProduct &&
                storePolicy.resolution?.distributionChannel && (<react_native_1.View style={styles.buttonWrapper}>
                <NativeStoreButton_1.NativeStoreButton method="apple_iap" product={normalizedProduct} distributionChannel={storePolicy.resolution.distributionChannel} checkout={checkout} label={display.appleIapLabel} onAttempt={callbacks.onPaymentAttempt} onSuccess={handleAppleIapSuccess} onError={handleAppleIapError}/>
              </react_native_1.View>)}
          {showGooglePlayBilling &&
                normalizedProduct &&
                storePolicy.resolution?.distributionChannel && (<react_native_1.View style={styles.buttonWrapper}>
                <NativeStoreButton_1.NativeStoreButton method="google_play_billing" product={normalizedProduct} distributionChannel={storePolicy.resolution.distributionChannel} checkout={checkout} label={display.googlePlayBillingLabel} onAttempt={callbacks.onPaymentAttempt} onSuccess={handleGooglePlaySuccess} onError={handleGooglePlayError}/>
              </react_native_1.View>)}
          {showRestorePurchases &&
                normalizedProduct &&
                storePolicy.resolution?.distributionChannel && (<react_native_1.View style={styles.buttonWrapper}>
                <RestorePurchasesButton_1.RestorePurchasesButton product={normalizedProduct} distributionChannel={storePolicy.resolution.distributionChannel} checkout={checkout} label={display.restorePurchasesLabel}/>
              </react_native_1.View>)}
          {showManageSubscriptions &&
                normalizedProduct &&
                storePolicy.resolution?.distributionChannel && (<react_native_1.View style={styles.buttonWrapper}>
                <ManageSubscriptionsButton_1.ManageSubscriptionsButton product={normalizedProduct} distributionChannel={storePolicy.resolution.distributionChannel} label={display.manageSubscriptionsLabel}/>
              </react_native_1.View>)}
          {showCard && (<react_native_1.View style={styles.buttonWrapper}>
              <StripeButton_1.StripeButton resource={isCartMode ? undefined : singleResource} items={isCartMode ? items : undefined} customerEmail={checkout.customerEmail} successUrl={checkout.successUrl} cancelUrl={checkout.cancelUrl} metadata={checkout.metadata} couponCode={checkout.couponCode} label={display.cardLabel} onAttempt={callbacks.onPaymentAttempt} onSuccess={handleStripeSuccess} onError={handleStripeError}/>
            </react_native_1.View>)}
          {showCrypto && (<react_native_1.View style={styles.buttonWrapper}>
              <CryptoButton_1.CryptoButton resource={isCartMode ? undefined : singleResource} items={isCartMode ? items : undefined} metadata={checkout.metadata} couponCode={checkout.couponCode} label={display.cryptoLabel} onAttempt={callbacks.onPaymentAttempt} onSuccess={handleCryptoSuccess} onError={handleCryptoError} hideMessages={hideMessages}/>
            </react_native_1.View>)}
          {showCredits && (<react_native_1.View style={styles.buttonWrapper}>
              <CreditsButton_1.CreditsButton resource={isCartMode ? undefined : singleResource} items={isCartMode ? items : undefined} authToken={checkout.authToken} metadata={checkout.metadata} couponCode={checkout.couponCode} label={display.creditsLabel} onAttempt={handleCreditsAttempt} onSuccess={handleCreditsSuccess} onError={handleCreditsError}/>
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
exports.CedrosPayButton = CedrosPay;
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