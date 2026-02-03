import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useCedrosShop } from '../../config/context';
import { useCart } from '../../state/cart/CartProvider';
import { useCheckout } from '../../state/checkout/useCheckout';
import { useInventoryVerification } from '../../hooks/useInventoryVerification';
import { usePaymentMethodsConfig } from '../../hooks/usePaymentMethodsConfig';
import { detectSolanaWallets } from '../../../utils/walletDetection';
import { Button } from '../ui/button';
import type { CheckoutSessionResult } from '../../adapters/CommerceAdapter';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { InventoryVerificationDialog } from './InventoryVerificationDialog';

interface PaymentStepProps {
  style?: ViewStyle;
  ctaLabel?: string;
  renderEmbedded?: (session: Extract<CheckoutSessionResult, { kind: 'embedded' }>) => React.ReactNode;
  embeddedFallback?: React.ReactNode;
  renderCustom?: (session: Extract<CheckoutSessionResult, { kind: 'custom' }>) => React.ReactNode;
  customFallback?: React.ReactNode;
}

export function PaymentStep({
  style,
  ctaLabel,
  renderEmbedded,
  embeddedFallback,
  renderCustom,
  customFallback,
}: PaymentStepProps) {
  const { config } = useCedrosShop();
  const cart = useCart();
  const checkout = useCheckout();

  // Fetch enabled payment methods from admin config
  const { config: paymentMethodsEnabled, isLoading: isLoadingPaymentConfig } = usePaymentMethodsConfig();

  const [hasSolanaWallet, setHasSolanaWallet] = React.useState(false);
  React.useEffect(() => {
    setHasSolanaWallet(detectSolanaWallets());
  }, []);

  // Inventory verification
  const inventoryVerification = useInventoryVerification({ items: cart.items });
  const [showInventoryDialog, setShowInventoryDialog] = React.useState(false);

  const methods = React.useMemo(
    () =>
      config.checkout.paymentMethods && config.checkout.paymentMethods.length
        ? config.checkout.paymentMethods
        : [{ id: 'card', label: 'Card', ctaLabel: 'Pay now' }],
    [config.checkout.paymentMethods]
  );

  // Filter methods based on admin-enabled settings AND runtime conditions (wallet detection)
  const visibleMethods = React.useMemo(() => {
    const filtered = methods.filter((m) => {
      // Check admin-enabled settings
      if (m.id === 'card' && !paymentMethodsEnabled.card) return false;
      if (m.id === 'crypto' && !paymentMethodsEnabled.crypto) return false;
      if (m.id === 'credits' && !paymentMethodsEnabled.credits) return false;

      // Runtime condition: crypto requires wallet
      if (m.id === 'crypto' && !hasSolanaWallet) return false;

      return true;
    });
    return filtered;
  }, [hasSolanaWallet, methods, paymentMethodsEnabled]);

  const [methodId, setMethodId] = React.useState((visibleMethods[0] ?? methods[0])!.id);

  React.useEffect(() => {
    if (!visibleMethods.length) return;
    if (visibleMethods.some((m) => m.id === methodId)) return;
    setMethodId(visibleMethods[0]!.id);
  }, [methodId, visibleMethods]);

  React.useEffect(() => {
    checkout.reset();
    // We intentionally clear any previous session/error when switching methods.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodId]);

  const activeMethod =
    visibleMethods.find((m) => m.id === methodId) ?? methods.find((m) => m.id === methodId) ?? methods[0]!;
  const hintText =
    activeMethod.description ?? (methodId === 'crypto' ? 'Pay using a connected wallet.' : undefined);

  const isCryptoUnavailable = methodId === 'crypto' && !hasSolanaWallet;

  const isBusy =
    isLoadingPaymentConfig ||
    checkout.status === 'validating' ||
    checkout.status === 'creating_session' ||
    checkout.status === 'redirecting' ||
    inventoryVerification.isVerifying;
  const label =
    ctaLabel ??
    activeMethod.ctaLabel ??
    (config.checkout.mode === 'none' ? 'Continue to payment' : 'Pay now');

  // Handle checkout with inventory verification
  const handleCheckout = React.useCallback(
    async (paymentMethodId: string) => {
      // Verify inventory first
      const result = await inventoryVerification.verify();
      if (!result.ok && result.issues.length > 0) {
        // Show dialog with issues - user can fix and retry
        setShowInventoryDialog(true);
        return;
      }
      // Proceed with checkout
      void checkout.createCheckoutSession({ paymentMethodId });
    },
    [checkout, inventoryVerification]
  );

  const embedded = checkout.session?.kind === 'embedded' ? checkout.session : null;
  const custom = checkout.session?.kind === 'custom' ? checkout.session : null;

  return (
    <View style={[styles.container, style]}>
      {visibleMethods.length > 1 ? (
        <View style={styles.paymentMethodContainer}>
          <Text style={styles.paymentMethodLabel}>Payment method</Text>
          <Tabs value={methodId} onValueChange={setMethodId}>
            <TabsList style={styles.tabsList}>
              {visibleMethods.map((m) => (
                <TabsTrigger
                  key={m.id}
                  value={m.id}
                  style={styles.tabTrigger}
                >
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </View>
      ) : null}

      {checkout.error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{checkout.error}</Text>
        </View>
      ) : null}

      {custom ? (
        <View style={styles.sessionContainer}>
          {renderCustom ? (
            renderCustom(custom)
          ) : (
            customFallback ?? (
              <View style={styles.fallbackContainer}>
                <Text style={styles.fallbackText}>
                  Checkout session created. Provide `renderCustom` to render a custom payment UI.
                </Text>
              </View>
            )
          )}
        </View>
      ) : embedded ? (
        <View style={styles.sessionContainer}>
          {renderEmbedded ? (
            renderEmbedded(embedded)
          ) : (
            embeddedFallback ?? (
              <View style={styles.fallbackContainer}>
                <Text style={styles.fallbackText}>
                  Embedded checkout session created. Provide `renderEmbedded` to render your payment UI.
                </Text>
              </View>
            )
          )}
        </View>
      ) : (
        <Button
          style={styles.payButton}
          disabled={cart.items.length === 0 || isBusy || isCryptoUnavailable}
          loading={isBusy}
          onPress={() => {
            void handleCheckout(methodId);
          }}
        >
          {inventoryVerification.isVerifying ? 'Checking availability...' : isBusy ? 'Processing...' : label}
        </Button>
      )}

      {!embedded && !custom ? (
        <Text style={styles.hintText}>
          {isCryptoUnavailable
            ? 'Install a browser wallet to enable crypto payments.'
            : (hintText ?? 'You will be redirected to complete your payment.')}
        </Text>
      ) : null}

      <InventoryVerificationDialog
        open={showInventoryDialog}
        onOpenChange={(open) => {
          setShowInventoryDialog(open);
          if (!open) {
            inventoryVerification.reset();
          }
        }}
        issues={inventoryVerification.result?.issues ?? []}
        onRemoveItem={(productId, variantId) => {
          cart.removeItem(productId, variantId);
        }}
        onUpdateQuantity={(productId, variantId, qty) => {
          cart.setQty(productId, variantId, qty);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
