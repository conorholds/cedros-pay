import React from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { StripeButton } from './StripeButton';
import { CryptoButton } from './CryptoButton';
import { CreditsButton } from './CreditsButton';
import { NativeStoreButton } from './NativeStoreButton';
import { RestorePurchasesButton } from './RestorePurchasesButton';
import { ManageSubscriptionsButton } from './ManageSubscriptionsButton';
import { PurchaseButton } from './PurchaseButton';
import { useCedrosContext } from '../context';
import { useCedrosTheme } from '../context';
import { usePaymentMode } from '../hooks/usePaymentMode';
import { useStoreAwarePaymentPolicy } from '../hooks/useStoreAwarePaymentPolicy';
import { mergeCedrosProductDefinition } from '../policy/resolveStoreProductConfiguration';
import {
  isManageableStoreSubscription,
  isRestorableStoreProduct,
  resolveNativeStoreMethod,
} from '../policy/nativeStoreSupport';
import { clusterApiUrl } from '@solana/web3.js';
import { getLogger } from '../utils/logger';
import { getCartItemCount } from '../utils/cartHelpers';
import type {
  CedrosProductDefinition,
  CedrosPayPolicyOverrides,
  CheckoutOptions,
  DisplayOptions,
  CallbackOptions,
  AdvancedOptions,
  CartItem,
  FulfillmentType,
} from '../types';

/**
 * Props for CedrosPay component
 *
 * Uses extensible options pattern for future-proof API:
 * - `checkout`: Customer info, coupons, redirects, metadata
 * - `display`: Labels, visibility, layout, className
 * - `callbacks`: Payment lifecycle event handlers
 * - `advanced`: Wallet config, testing options
 *
 * @example
 * // Single item purchase
 * <CedrosPay
 *   resource="item-1"
 *   checkout={{ customerEmail: "user@example.com", couponCode: "SAVE20" }}
 *   display={{ cardLabel: "Pay with Card", layout: "horizontal" }}
 *   callbacks={{ onPaymentSuccess: handlePaymentSuccess }}
 * />
 *
 * @example
 * // Cart checkout with multiple items
 * <CedrosPay
 *   items={[
 *     { resource: "item-1", quantity: 2 },
 *     { resource: "item-2", quantity: 1 }
 *   ]}
 *   checkout={{ customerEmail: "user@example.com" }}
 *   display={{ layout: "horizontal" }}
 * />
 *
 * @example
 * // Unified purchase button with modal
 * <CedrosPay
 *   resource="item-1"
 *   display={{ showPurchaseButton: true, purchaseLabel: "Buy Now" }}
 *   advanced={{ autoDetectWallets: true }}
 * />
 */
export interface CedrosPayProps {
  /** Single item resource ID (mutually exclusive with items) */
  resource?: string;

  /** Multiple items for cart checkout (mutually exclusive with resource) */
  items?: CartItem[];

  /** Explicit product metadata for store-aware orchestration */
  product?: CedrosProductDefinition;

  /** Convenience classification for legacy resource-based usage */
  fulfillmentType?: FulfillmentType;

  /** Per-component policy overrides */
  policy?: CedrosPayPolicyOverrides;

  /** Checkout options: customer info, coupons, redirects, metadata */
  checkout?: CheckoutOptions;

  /** Display options: labels, visibility, layout, className */
  display?: DisplayOptions;

  /** Callback options: payment lifecycle event handlers */
  callbacks?: CallbackOptions;

  /** Advanced options: wallet config, testing */
  advanced?: AdvancedOptions;

  /** Custom container style */
  style?: ViewStyle;
}

export function CedrosPay(props: CedrosPayProps) {
  const {
    resource,
    items,
    product,
    fulfillmentType,
    policy,
    checkout = {},
    display = {},
    callbacks = {},
    advanced = {},
    style,
  } = props;
  const { config, walletPool } = useCedrosContext();
  const theme = useCedrosTheme();
  const { isCartMode } = usePaymentMode(resource, items);

  const singleResource = React.useMemo(
    () => product?.id ?? resource ?? (items?.length === 1 ? items[0].resource : undefined),
    [items, product, resource]
  );

  const catalogProduct = React.useMemo(() => {
    if (!singleResource) {
      return undefined;
    }

    return config.paymentPolicy?.productCatalog?.[singleResource];
  }, [config.paymentPolicy?.productCatalog, singleResource]);

  const normalizedProduct = React.useMemo(() => {
    return mergeCedrosProductDefinition({
      fallbackId: singleResource,
      fallbackFulfillmentType: fulfillmentType,
      catalogProduct,
      explicitProduct: product,
    });
  }, [catalogProduct, fulfillmentType, product, singleResource]);

  const storePolicy = useStoreAwarePaymentPolicy({
    product: normalizedProduct,
    policy,
    purchaseMode: isCartMode ? 'cart' : 'single',
  });

  // Memoize cart item count to avoid recalculating on every render
  const cartItemCount = React.useMemo(
    () => (items ? getCartItemCount(items) : 0),
    [items]
  );

  // CRITICAL FIX: Memoize callback wrappers to prevent infinite loops
  const handleStripeSuccess = React.useMemo(
    () =>
      callbacks.onPaymentSuccess
        ? (txId: string) => callbacks.onPaymentSuccess!({ transactionId: txId, method: 'stripe' })
        : undefined,
    [callbacks.onPaymentSuccess]
  );

  const handleCryptoSuccess = React.useMemo(
    () =>
      callbacks.onPaymentSuccess
        ? (txId: string) => callbacks.onPaymentSuccess!({ transactionId: txId, method: 'crypto' })
        : undefined,
    [callbacks.onPaymentSuccess]
  );

  const handleStripeError = React.useMemo(
    () =>
      callbacks.onPaymentError
        ? (error: string) => callbacks.onPaymentError!({ message: error, method: 'stripe' })
        : undefined,
    [callbacks.onPaymentError]
  );

  const handleCryptoError = React.useMemo(
    () =>
      callbacks.onPaymentError
        ? (error: string) => callbacks.onPaymentError!({ message: error, method: 'crypto' })
        : undefined,
    [callbacks.onPaymentError]
  );

  const handleAppleIapSuccess = React.useMemo(
    () =>
      callbacks.onPaymentSuccess
        ? (txId: string) =>
            callbacks.onPaymentSuccess!({
              transactionId: txId,
              method: 'apple_iap',
            })
        : undefined,
    [callbacks.onPaymentSuccess]
  );

  const handleAppleIapError = React.useMemo(
    () =>
      callbacks.onPaymentError
        ? (error: string) =>
            callbacks.onPaymentError!({ message: error, method: 'apple_iap' })
        : undefined,
    [callbacks.onPaymentError]
  );

  const handleGooglePlaySuccess = React.useMemo(
    () =>
      callbacks.onPaymentSuccess
        ? (txId: string) =>
            callbacks.onPaymentSuccess!({
              transactionId: txId,
              method: 'google_play_billing',
            })
        : undefined,
    [callbacks.onPaymentSuccess]
  );

  const handleGooglePlayError = React.useMemo(
    () =>
      callbacks.onPaymentError
        ? (error: string) =>
            callbacks.onPaymentError!({
              message: error,
              method: 'google_play_billing',
            })
        : undefined,
    [callbacks.onPaymentError]
  );

  const handleCreditsSuccess = React.useMemo(
    () =>
      callbacks.onPaymentSuccess
        ? (txId: string) => callbacks.onPaymentSuccess!({ transactionId: txId, method: 'credits' })
        : undefined,
    [callbacks.onPaymentSuccess]
  );

  const handleCreditsError = React.useMemo(
    () =>
      callbacks.onPaymentError
        ? (error: string) => callbacks.onPaymentError!({ message: error, method: 'credits' })
        : undefined,
    [callbacks.onPaymentError]
  );

  const handleCreditsAttempt = React.useMemo(
    () => (callbacks.onPaymentAttempt ? () => callbacks.onPaymentAttempt!('credits') : undefined),
    [callbacks.onPaymentAttempt]
  );

  const endpoint = config.solanaEndpoint ?? clusterApiUrl(config.solanaCluster);

  // Memoize wallets array to prevent WalletProvider re-initialization
  const wallets = React.useMemo(
    () => (advanced.wallets && advanced.wallets.length > 0 ? advanced.wallets : walletPool.getAdapters()),
    [advanced.wallets, walletPool]
  );

  // Validate input (after all hooks)
  if (!resource && (!items || items.length === 0)) {
    if (!product) {
      getLogger().error('CedrosPay: Must provide either "resource", "items", or "product" prop');
      return (
        <View style={style}>
          <Text style={{ color: theme.tokens?.errorText || '#ef4444' }}>
            Configuration error: No resource, items, or product provided
          </Text>
        </View>
      );
    }
  }

  const allowedMethods = storePolicy.renderableMethods;

  const showAppleIap =
    (storePolicy.usesOrchestration
      ? allowedMethods.includes('apple_iap')
      : false) && (display.showAppleIap ?? true);
  const showGooglePlayBilling =
    (storePolicy.usesOrchestration
      ? allowedMethods.includes('google_play_billing')
      : false) && (display.showGooglePlayBilling ?? true);
  const showCard =
    (storePolicy.usesOrchestration
      ? allowedMethods.includes('stripe')
      : display.showCard ?? true) && (display.showCard ?? true);
  const showCrypto =
    (storePolicy.usesOrchestration
      ? allowedMethods.includes('x402') || allowedMethods.includes('crypto')
      : display.showCrypto ?? true) && (display.showCrypto ?? true);
  const showCredits =
    (storePolicy.usesOrchestration
      ? allowedMethods.includes('credits')
      : display.showCredits ?? false) && (display.showCredits ?? false);
  const showPurchaseButton = display.showPurchaseButton ?? false;
  const layout = display.layout ?? 'vertical';
  const hideMessages = display.hideMessages ?? false;
  const autoDetectWallets = advanced.autoDetectWallets ?? true;
  const hasNativeStoreMethod = showAppleIap || showGooglePlayBilling;
  const nativeMethod = resolveNativeStoreMethod(
    storePolicy.resolution?.distributionChannel
  );
  const nativeHandler = nativeMethod
    ? config.paymentPolicy?.nativeHandlers?.[nativeMethod]
    : undefined;
  const canRestorePurchases =
    config.paymentPolicy?.storeBilling?.enabled !== false ||
    Boolean(nativeHandler?.restorePurchases);
  const canManageSubscriptions =
    config.paymentPolicy?.storeBilling?.enabled !== false ||
    Boolean(nativeHandler?.openManageSubscriptions);
  const showRestorePurchases =
    hasNativeStoreMethod &&
    canRestorePurchases &&
    Boolean(normalizedProduct) &&
    (display.showRestorePurchases ?? isRestorableStoreProduct(normalizedProduct));
  const showManageSubscriptions =
    hasNativeStoreMethod &&
    canManageSubscriptions &&
    Boolean(normalizedProduct) &&
    (display.showManageSubscriptions ??
      isManageableStoreSubscription(normalizedProduct));

  if (storePolicy.usesOrchestration && storePolicy.resolution?.failure) {
    getLogger().error(
      'CedrosPay: Unable to resolve a store-compliant payment method',
      storePolicy.resolution.failure
    );
    return (
      <View style={style}>
        <Text style={{ color: theme.tokens?.errorText || '#ef4444' }}>
          {storePolicy.resolution.failure.message}
        </Text>
      </View>
    );
  }

  const content = (
    <View style={[styles.content, layout === 'horizontal' && styles.horizontalLayout]}>
      {showPurchaseButton ? (
        <PurchaseButton
          resource={isCartMode ? undefined : singleResource}
          items={isCartMode ? items : undefined}
          product={normalizedProduct}
          distributionChannel={storePolicy.resolution?.distributionChannel}
          label={display.purchaseLabel}
          appleIapLabel={display.appleIapLabel}
          googlePlayBillingLabel={display.googlePlayBillingLabel}
          restorePurchasesLabel={display.restorePurchasesLabel}
          manageSubscriptionsLabel={display.manageSubscriptionsLabel}
          cardLabel={display.cardLabel}
          cryptoLabel={display.cryptoLabel}
          creditsLabel={display.creditsLabel}
          showAppleIap={showAppleIap}
          showGooglePlayBilling={showGooglePlayBilling}
          showRestorePurchases={showRestorePurchases}
          showManageSubscriptions={showManageSubscriptions}
          showCard={showCard}
          showCrypto={showCrypto}
          showCredits={showCredits}
          onPaymentAttempt={callbacks.onPaymentAttempt}
          onPaymentSuccess={handleStripeSuccess}
          onPaymentError={handleStripeError}
          onAppleIapSuccess={handleAppleIapSuccess}
          onGooglePlayBillingSuccess={handleGooglePlaySuccess}
          onStripeSuccess={handleStripeSuccess}
          onCryptoSuccess={handleCryptoSuccess}
          onCreditsSuccess={handleCreditsSuccess}
          onAppleIapError={handleAppleIapError}
          onGooglePlayBillingError={handleGooglePlayError}
          onStripeError={handleStripeError}
          onCryptoError={handleCryptoError}
          onCreditsError={handleCreditsError}
          customerEmail={checkout.customerEmail}
          successUrl={checkout.successUrl}
          cancelUrl={checkout.cancelUrl}
          metadata={checkout.metadata}
          couponCode={checkout.couponCode}
          autoDetectWallets={autoDetectWallets}
          hideMessages={hideMessages}
          renderModal={display.renderModal}
        />
      ) : (
        <>
          {showAppleIap &&
            normalizedProduct &&
            storePolicy.resolution?.distributionChannel && (
              <View style={styles.buttonWrapper}>
                <NativeStoreButton
                  method="apple_iap"
                  product={normalizedProduct}
                  distributionChannel={storePolicy.resolution.distributionChannel}
                  checkout={checkout}
                  label={display.appleIapLabel}
                  onAttempt={callbacks.onPaymentAttempt}
                  onSuccess={handleAppleIapSuccess}
                  onError={handleAppleIapError}
                />
              </View>
            )}
          {showGooglePlayBilling &&
            normalizedProduct &&
            storePolicy.resolution?.distributionChannel && (
              <View style={styles.buttonWrapper}>
                <NativeStoreButton
                  method="google_play_billing"
                  product={normalizedProduct}
                  distributionChannel={storePolicy.resolution.distributionChannel}
                  checkout={checkout}
                  label={display.googlePlayBillingLabel}
                  onAttempt={callbacks.onPaymentAttempt}
                  onSuccess={handleGooglePlaySuccess}
                  onError={handleGooglePlayError}
                />
              </View>
            )}
          {showRestorePurchases &&
            normalizedProduct &&
            storePolicy.resolution?.distributionChannel && (
              <View style={styles.buttonWrapper}>
                <RestorePurchasesButton
                  product={normalizedProduct}
                  distributionChannel={storePolicy.resolution.distributionChannel}
                  checkout={checkout}
                  label={display.restorePurchasesLabel}
                />
              </View>
            )}
          {showManageSubscriptions &&
            normalizedProduct &&
            storePolicy.resolution?.distributionChannel && (
              <View style={styles.buttonWrapper}>
                <ManageSubscriptionsButton
                  product={normalizedProduct}
                  distributionChannel={storePolicy.resolution.distributionChannel}
                  label={display.manageSubscriptionsLabel}
                />
              </View>
            )}
          {showCard && (
            <View style={styles.buttonWrapper}>
              <StripeButton
                resource={isCartMode ? undefined : singleResource}
                items={isCartMode ? items : undefined}
                customerEmail={checkout.customerEmail}
                successUrl={checkout.successUrl}
                cancelUrl={checkout.cancelUrl}
                metadata={checkout.metadata}
                couponCode={checkout.couponCode}
                label={display.cardLabel}
                onAttempt={callbacks.onPaymentAttempt}
                onSuccess={handleStripeSuccess}
                onError={handleStripeError}
              />
            </View>
          )}
          {showCrypto && (
            <View style={styles.buttonWrapper}>
              <CryptoButton
                resource={isCartMode ? undefined : singleResource}
                items={isCartMode ? items : undefined}
                metadata={checkout.metadata}
                couponCode={checkout.couponCode}
                label={display.cryptoLabel}
                onAttempt={callbacks.onPaymentAttempt}
                onSuccess={handleCryptoSuccess}
                onError={handleCryptoError}
                hideMessages={hideMessages}
              />
            </View>
          )}
          {showCredits && (
            <View style={styles.buttonWrapper}>
              <CreditsButton
                resource={isCartMode ? undefined : singleResource}
                items={isCartMode ? items : undefined}
                authToken={checkout.authToken}
                metadata={checkout.metadata}
                couponCode={checkout.couponCode}
                label={display.creditsLabel}
                onAttempt={handleCreditsAttempt}
                onSuccess={handleCreditsSuccess}
                onError={handleCreditsError}
              />
            </View>
          )}
        </>
      )}
      {isCartMode && items && items.length > 1 && !hideMessages && (
        <Text style={[styles.cartNotification, { color: theme.tokens?.surfaceText || '#6b7280' }]}>
          Checking out {cartItemCount} items
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={false}>
          {content}
        </WalletProvider>
      </ConnectionProvider>
    </View>
  );
}

export const CedrosPayButton = CedrosPay;

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
