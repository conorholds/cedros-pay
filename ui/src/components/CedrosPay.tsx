import React from 'react';
import { StripeButton } from './StripeButton';
import { CreditsButton } from './CreditsButton';
import { PurchaseButton } from './PurchaseButton';
import { useCedrosContext } from '../context';
import { useCedrosTheme } from '../context';
import { usePaymentMode } from '../hooks/usePaymentMode';
import { getLogger } from '../utils/logger';
import { getCartItemCount } from '../utils/cartHelpers';
import type {
  CheckoutOptions,
  DisplayOptions,
  CallbackOptions,
  AdvancedOptions,
  CartItem,
  SolanaCluster,
} from '../types';

/** Inline cluster URL map so we don't import @solana/web3.js at module scope */
const CLUSTER_URLS: Record<SolanaCluster, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
};

/**
 * Hook to lazy-load Solana wallet-adapter-react providers.
 * Returns null until the module is loaded, then provides ConnectionProvider + WalletProvider.
 */
function useSolanaProviders() {
  const [providers, setProviders] = React.useState<{
    ConnectionProvider: React.ComponentType<{ endpoint: string; children: React.ReactNode }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    WalletProvider: React.ComponentType<{ wallets: any[]; autoConnect: boolean; children: React.ReactNode }>;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    import('@solana/wallet-adapter-react').then((mod) => {
      if (!cancelled) setProviders(mod);
    });
    return () => { cancelled = true; };
  }, []);

  return providers;
}

/**
 * Wraps children in Solana ConnectionProvider + WalletProvider.
 * Renders children without providers until the Solana module loads.
 */
function SolanaProviderWrapper({
  endpoint,
  wallets,
  children,
}: {
  endpoint: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallets: any[];
  children: React.ReactNode;
}) {
  const providers = useSolanaProviders();

  // Render children immediately; Solana providers wrap once loaded
  if (!providers) return <>{children}</>;

  const { ConnectionProvider, WalletProvider } = providers;
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}

/** Lazy-loaded CryptoButton (only fetched when crypto is shown) */
const LazyCryptoButton = React.lazy(() =>
  import('./CryptoButton').then((mod) => ({ default: mod.CryptoButton }))
);

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
 *   callbacks={{ onPaymentSuccess: (result) => console.log(result) }}
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

  /** Checkout options: customer info, coupons, redirects, metadata */
  checkout?: CheckoutOptions;

  /** Display options: labels, visibility, layout, className */
  display?: DisplayOptions;

  /** Callback options: payment lifecycle event handlers */
  callbacks?: CallbackOptions;

  /** Advanced options: wallet config, testing */
  advanced?: AdvancedOptions;
}

export function CedrosPay(props: CedrosPayProps) {
  const { resource, items, checkout = {}, display = {}, callbacks = {}, advanced = {} } = props;
  const { config, walletPool } = useCedrosContext();
  const theme = useCedrosTheme();
  const { isCartMode } = usePaymentMode(resource, items);

  // Compute showCrypto early so we can skip wallet pool access when false
  const showCrypto = display.showCrypto ?? true;

  // Memoize cart notification style to prevent unnecessary re-renders
  const cartNotificationStyle = React.useMemo(() => ({
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: theme.tokens.surfaceText,
    opacity: 0.7,
    textAlign: 'center' as const,
  }), [theme.tokens.surfaceText]);

  // Memoize wallets array to prevent WalletProvider re-initialization on every render
  // Only access walletPool when crypto is enabled to avoid loading Solana adapters
  const wallets = React.useMemo(
    () => {
      if (!showCrypto) return [];
      return advanced.wallets && advanced.wallets.length > 0 ? advanced.wallets : walletPool.getAdapters();
    },
    [advanced.wallets, walletPool, showCrypto]
  );

  // Memoize cart item count to avoid recalculating on every render
  const cartItemCount = React.useMemo(
    () => items ? getCartItemCount(items) : 0,
    [items]
  );

  // Destructure callbacks to get stable references for useCallback deps
  const { onPaymentSuccess, onPaymentError, onPaymentAttempt } = callbacks;

  // Memoize callback wrappers to prevent infinite loops
  const handleStripeSuccess = React.useCallback(
    (txId: string) => onPaymentSuccess?.({ transactionId: txId, method: 'stripe' }),
    [onPaymentSuccess]
  );

  const handleCryptoSuccess = React.useCallback(
    (txId: string) => onPaymentSuccess?.({ transactionId: txId, method: 'crypto' }),
    [onPaymentSuccess]
  );

  const handleStripeError = React.useCallback(
    (error: string) => onPaymentError?.({ message: error, method: 'stripe' }),
    [onPaymentError]
  );

  const handleCryptoError = React.useCallback(
    (error: string) => onPaymentError?.({ message: error, method: 'crypto' }),
    [onPaymentError]
  );

  const handleCreditsSuccess = React.useCallback(
    (txId: string) => onPaymentSuccess?.({ transactionId: txId, method: 'credits' }),
    [onPaymentSuccess]
  );

  const handleCreditsError = React.useCallback(
    (error: string) => onPaymentError?.({ message: error, method: 'credits' }),
    [onPaymentError]
  );

  const handleCreditsAttempt = React.useCallback(
    () => onPaymentAttempt?.('credits'),
    [onPaymentAttempt]
  );

  // Only compute Solana endpoint when crypto is shown
  const endpoint = showCrypto
    ? (config.solanaEndpoint ?? CLUSTER_URLS[config.solanaCluster])
    : '';

  // Validate input (after all hooks)
  if (!resource && (!items || items.length === 0)) {
    getLogger().error('CedrosPay: Must provide either "resource" or "items" prop');
    return (
      <div className={display.className} style={{ color: theme.tokens.errorText }}>
        Configuration error: No resource or items provided
      </div>
    );
  }

  // Extract final values with defaults
  const showCard = display.showCard ?? true;
  const showCredits = display.showCredits ?? false;
  const showPurchaseButton = display.showPurchaseButton ?? false;
  const layout = display.layout ?? 'vertical';
  const hideMessages = display.hideMessages ?? false;
  const autoDetectWallets = advanced.autoDetectWallets ?? true;

  const innerContent = (
    <div className={theme.unstyled ? display.className : `cedros-theme__pay ${display.className || ''}`}>
      <div className={theme.unstyled ? '' : `cedros-theme__pay-content cedros-theme__pay-content--${layout}`}>
        {showPurchaseButton ? (
          <PurchaseButton
            resource={isCartMode ? undefined : (resource || items?.[0]?.resource)}
            items={isCartMode ? items : undefined}
            label={display.purchaseLabel}
            cardLabel={display.cardLabel}
            cryptoLabel={display.cryptoLabel}
            showCard={showCard}
            showCrypto={showCrypto}
            onPaymentAttempt={callbacks.onPaymentAttempt}
            onPaymentSuccess={handleStripeSuccess}
            onPaymentError={handleStripeError}
            onStripeSuccess={handleStripeSuccess}
            onCryptoSuccess={handleCryptoSuccess}
            onStripeError={handleStripeError}
            onCryptoError={handleCryptoError}
            customerEmail={checkout.customerEmail}
            successUrl={checkout.successUrl}
            cancelUrl={checkout.cancelUrl}
            metadata={checkout.metadata}
            couponCode={checkout.couponCode}
            autoDetectWallets={autoDetectWallets}
            testPageUrl={advanced.testPageUrl}
            hideMessages={hideMessages}
            renderModal={display.renderModal}
          />
        ) : (
          <>
            {showCard && (
              <StripeButton
                resource={isCartMode ? undefined : (resource || items?.[0]?.resource)}
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
            )}
            {showCrypto && (
              <React.Suspense fallback={null}>
                <LazyCryptoButton
                  resource={isCartMode ? undefined : (resource || items?.[0]?.resource)}
                  items={isCartMode ? items : undefined}
                  metadata={checkout.metadata}
                  couponCode={checkout.couponCode}
                  label={display.cryptoLabel}
                  onAttempt={callbacks.onPaymentAttempt}
                  onSuccess={handleCryptoSuccess}
                  onError={handleCryptoError}
                  testPageUrl={advanced.testPageUrl}
                  hideMessages={hideMessages}
                />
              </React.Suspense>
            )}
            {showCredits && (
              <CreditsButton
                resource={isCartMode ? undefined : (resource || items?.[0]?.resource)}
                items={isCartMode ? items : undefined}
                authToken={checkout.authToken}
                metadata={checkout.metadata}
                couponCode={checkout.couponCode}
                label={display.creditsLabel}
                onAttempt={handleCreditsAttempt}
                onSuccess={handleCreditsSuccess}
                onError={handleCreditsError}
              />
            )}
          </>
        )}
        {isCartMode && items && items.length > 1 && !hideMessages && (
          <div style={cartNotificationStyle}>
            Checking out {cartItemCount} items
          </div>
        )}
      </div>
    </div>
  );

  // Always render SolanaProviderWrapper so wallet-adapter context is stable.
  // When crypto is disabled we pass an empty wallets array and a placeholder
  // endpoint so the wrapper mounts once and never re-initialises on toggle.
  return (
    <div className={theme.unstyled ? display.className : theme.className} style={theme.unstyled ? {} : theme.style}>
      <SolanaProviderWrapper endpoint={endpoint || 'https://api.devnet.solana.com'} wallets={wallets}>
        {innerContent}
      </SolanaProviderWrapper>
    </div>
  );
}
