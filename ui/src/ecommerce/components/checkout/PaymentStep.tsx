import * as React from 'react';
import { useCedrosShop } from '../../config/context';
import { useCart } from '../../state/cart/CartProvider';
import { useCheckout } from '../../state/checkout/useCheckout';
import { useInventoryVerification } from '../../hooks/useInventoryVerification';
import { usePaymentMethodsConfig } from '../../hooks/usePaymentMethodsConfig';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import type { CheckoutSessionResult } from '../../adapters/CommerceAdapter';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { InventoryVerificationDialog } from './InventoryVerificationDialog';

export function PaymentStep({
  className,
  ctaLabel,
  renderEmbedded,
  embeddedFallback,
  renderCustom,
  customFallback,
}: {
  className?: string;
  ctaLabel?: string;
  renderEmbedded?: (session: Extract<CheckoutSessionResult, { kind: 'embedded' }>) => React.ReactNode;
  embeddedFallback?: React.ReactNode;
  renderCustom?: (session: Extract<CheckoutSessionResult, { kind: 'custom' }>) => React.ReactNode;
  customFallback?: React.ReactNode;
}) {
  const { config } = useCedrosShop();
  const cart = useCart();
  const checkout = useCheckout();

  // Fetch enabled payment methods from admin config
  const { config: paymentMethodsEnabled, isLoading: isLoadingPaymentConfig } = usePaymentMethodsConfig();

  const [hasSolanaWallet, setHasSolanaWallet] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    void import('../../../utils/walletDetection').then((module) => {
      if (active) {
        setHasSolanaWallet(module.detectSolanaWallets());
      }
    });
    return () => {
      active = false;
    };
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

  const [methodId, setMethodId] = React.useState((visibleMethods[0] ?? methods[0])?.id ?? 'card');

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
    visibleMethods.find((m) => m.id === methodId) ?? methods.find((m) => m.id === methodId) ?? methods[0] ?? { id: 'card', label: 'Card', ctaLabel: 'Pay now' };
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
    <div className={cn('space-y-3', className)}>
      {visibleMethods.length > 1 ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Payment method</div>
          <Tabs value={methodId} onValueChange={setMethodId}>
            <TabsList className="w-full">
              {visibleMethods.map((m) => (
                <TabsTrigger key={m.id} value={m.id} className="flex-1" disabled={isBusy}>
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      ) : null}

      {checkout.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {checkout.error}
        </div>
      ) : null}

      {custom ? (
        <div className="space-y-3">
          {renderCustom ? (
            renderCustom(custom)
          ) : (
            customFallback ?? (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300">
                Checkout session created. Provide `renderCustom` to render a custom payment UI.
              </div>
            )
          )}
        </div>
      ) : embedded ? (
        <div className="space-y-3">
          {renderEmbedded ? (
            renderEmbedded(embedded)
          ) : (
            embeddedFallback ?? (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-300">
                Embedded checkout session created. Provide `renderEmbedded` to render your payment UI.
              </div>
            )
          )}
        </div>
      ) : (
        <Button
          type="button"
          className="w-full"
          disabled={cart.items.length === 0 || isBusy || isCryptoUnavailable}
          onClick={() => {
            void handleCheckout(methodId);
          }}
        >
          {inventoryVerification.isVerifying ? 'Checking availability…' : isBusy ? 'Processing…' : label}
        </Button>
      )}

      {!embedded && !custom ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {isCryptoUnavailable
            ? 'Install a browser wallet to enable crypto payments.'
            : (hintText ?? 'You will be redirected to complete your payment.')}
        </p>
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
    </div>
  );
}
