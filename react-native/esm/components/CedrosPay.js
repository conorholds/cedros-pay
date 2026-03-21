import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { StripeButton } from './StripeButton';
import { CryptoButton } from './CryptoButton';
import { CreditsButton } from './CreditsButton';
import { PurchaseButton } from './PurchaseButton';
import { useCedrosContext } from '../context';
import { useCedrosTheme } from '../context';
import { usePaymentMode } from '../hooks/usePaymentMode';
import { clusterApiUrl } from '@solana/web3.js';
import { getLogger } from '../utils/logger';
import { getCartItemCount } from '../utils/cartHelpers';
export function CedrosPay(props) {
    const { resource, items, checkout = {}, display = {}, callbacks = {}, advanced = {}, style } = props;
    const { config, walletPool } = useCedrosContext();
    const theme = useCedrosTheme();
    const { isCartMode } = usePaymentMode(resource, items);
    // Memoize cart item count to avoid recalculating on every render
    const cartItemCount = React.useMemo(() => (items ? getCartItemCount(items) : 0), [items]);
    // CRITICAL FIX: Memoize callback wrappers to prevent infinite loops
    const handleStripeSuccess = React.useMemo(() => callbacks.onPaymentSuccess
        ? (txId) => callbacks.onPaymentSuccess({ transactionId: txId, method: 'stripe' })
        : undefined, [callbacks.onPaymentSuccess]);
    const handleCryptoSuccess = React.useMemo(() => callbacks.onPaymentSuccess
        ? (txId) => callbacks.onPaymentSuccess({ transactionId: txId, method: 'crypto' })
        : undefined, [callbacks.onPaymentSuccess]);
    const handleStripeError = React.useMemo(() => callbacks.onPaymentError
        ? (error) => callbacks.onPaymentError({ message: error, method: 'stripe' })
        : undefined, [callbacks.onPaymentError]);
    const handleCryptoError = React.useMemo(() => callbacks.onPaymentError
        ? (error) => callbacks.onPaymentError({ message: error, method: 'crypto' })
        : undefined, [callbacks.onPaymentError]);
    const handleCreditsSuccess = React.useMemo(() => callbacks.onPaymentSuccess
        ? (txId) => callbacks.onPaymentSuccess({ transactionId: txId, method: 'credits' })
        : undefined, [callbacks.onPaymentSuccess]);
    const handleCreditsError = React.useMemo(() => callbacks.onPaymentError
        ? (error) => callbacks.onPaymentError({ message: error, method: 'credits' })
        : undefined, [callbacks.onPaymentError]);
    const handleCreditsAttempt = React.useMemo(() => (callbacks.onPaymentAttempt ? () => callbacks.onPaymentAttempt('credits') : undefined), [callbacks.onPaymentAttempt]);
    const endpoint = config.solanaEndpoint ?? clusterApiUrl(config.solanaCluster);
    // Memoize wallets array to prevent WalletProvider re-initialization
    const wallets = React.useMemo(() => (advanced.wallets && advanced.wallets.length > 0 ? advanced.wallets : walletPool.getAdapters()), [advanced.wallets, walletPool]);
    // Validate input (after all hooks)
    if (!resource && (!items || items.length === 0)) {
        getLogger().error('CedrosPay: Must provide either "resource" or "items" prop');
        return (<View style={style}>
        <Text style={{ color: theme.tokens?.errorText || '#ef4444' }}>
          Configuration error: No resource or items provided
        </Text>
      </View>);
    }
    // Extract final values with defaults
    const showCard = display.showCard ?? true;
    const showCrypto = display.showCrypto ?? true;
    const showCredits = display.showCredits ?? false;
    const showPurchaseButton = display.showPurchaseButton ?? false;
    const layout = display.layout ?? 'vertical';
    const hideMessages = display.hideMessages ?? false;
    const autoDetectWallets = advanced.autoDetectWallets ?? true;
    const content = (<View style={[styles.content, layout === 'horizontal' && styles.horizontalLayout]}>
      {showPurchaseButton ? (<PurchaseButton resource={isCartMode ? undefined : resource || items?.[0]?.resource} items={isCartMode ? items : undefined} label={display.purchaseLabel} cardLabel={display.cardLabel} cryptoLabel={display.cryptoLabel} showCard={showCard} showCrypto={showCrypto} onPaymentAttempt={callbacks.onPaymentAttempt} onPaymentSuccess={handleStripeSuccess} onPaymentError={handleStripeError} onStripeSuccess={handleStripeSuccess} onCryptoSuccess={handleCryptoSuccess} onStripeError={handleStripeError} onCryptoError={handleCryptoError} customerEmail={checkout.customerEmail} successUrl={checkout.successUrl} cancelUrl={checkout.cancelUrl} metadata={checkout.metadata} couponCode={checkout.couponCode} autoDetectWallets={autoDetectWallets} hideMessages={hideMessages} renderModal={display.renderModal}/>) : (<>
          {showCard && (<View style={styles.buttonWrapper}>
              <StripeButton resource={isCartMode ? undefined : resource || items?.[0]?.resource} items={isCartMode ? items : undefined} customerEmail={checkout.customerEmail} successUrl={checkout.successUrl} cancelUrl={checkout.cancelUrl} metadata={checkout.metadata} couponCode={checkout.couponCode} label={display.cardLabel} onAttempt={callbacks.onPaymentAttempt} onSuccess={handleStripeSuccess} onError={handleStripeError}/>
            </View>)}
          {showCrypto && (<View style={styles.buttonWrapper}>
              <CryptoButton resource={isCartMode ? undefined : resource || items?.[0]?.resource} items={isCartMode ? items : undefined} metadata={checkout.metadata} couponCode={checkout.couponCode} label={display.cryptoLabel} onAttempt={callbacks.onPaymentAttempt} onSuccess={handleCryptoSuccess} onError={handleCryptoError} hideMessages={hideMessages}/>
            </View>)}
          {showCredits && (<View style={styles.buttonWrapper}>
              <CreditsButton resource={isCartMode ? undefined : resource || items?.[0]?.resource} items={isCartMode ? items : undefined} authToken={checkout.authToken} metadata={checkout.metadata} couponCode={checkout.couponCode} label={display.creditsLabel} onAttempt={handleCreditsAttempt} onSuccess={handleCreditsSuccess} onError={handleCreditsError}/>
            </View>)}
        </>)}
      {isCartMode && items && items.length > 1 && !hideMessages && (<Text style={[styles.cartNotification, { color: theme.tokens?.surfaceText || '#6b7280' }]}>
          Checking out {cartItemCount} items
        </Text>)}
    </View>);
    return (<View style={[styles.container, style]}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={false}>
          {content}
        </WalletProvider>
      </ConnectionProvider>
    </View>);
}
const styles = StyleSheet.create({
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