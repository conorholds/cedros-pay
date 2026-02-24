import * as React from 'react';
import { useCedrosShop } from '../config/context';
import { useCart } from '../state/cart/CartProvider';
import { useCheckoutResultFromUrl } from '../hooks/useCheckoutResultFromUrl';
import { cn } from '../utils/cn';
import { CheckoutLayout } from '../components/checkout/CheckoutLayout';
import { CheckoutForm } from '../components/checkout/CheckoutForm';
import { OrderReview } from '../components/checkout/OrderReview';
import { PaymentStep } from '../components/checkout/PaymentStep';
import { CheckoutReceipt } from '../components/checkout/CheckoutReceipt';
import { Separator } from '../components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CheckoutProvider } from '../state/checkout/useCheckout';
import { Button } from '../components/ui/button';

export function CheckoutTemplate({
  className,
  routes,
}: {
  className?: string;
  routes?: { shop?: string; orders?: string; login?: string };
}) {
  const { config } = useCedrosShop();
  const cart = useCart();
  const result = useCheckoutResultFromUrl();

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

  const shopHref = routes?.shop ?? '/shop';
  const ordersHref = routes?.orders ?? '/account/orders';
  const loginHref = routes?.login;

  return (
    <div className={cn('min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50', className)}>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <CheckoutReceipt
          result={result}
          onContinueShopping={() => {
            if (typeof window !== 'undefined') window.location.assign(shopHref);
          }}
          onViewOrders={() => {
            if (typeof window !== 'undefined') window.location.assign(ordersHref);
          }}
        />

        {result.kind === 'idle' ? (
          <>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                {config.checkout.mode === 'none'
                  ? 'Confirm and pay.'
                  : 'Enter details, then complete payment.'}
              </p>
            </div>
            <div className="mt-8">
              <CheckoutProvider>
                {shouldBlockForAuth ? (
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base">Sign in required</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        This store requires an account to complete checkout.
                      </div>
                      {loginHref ? (
                        <div className="mt-4">
                          <Button
                            type="button"
                            onClick={() => {
                              if (typeof window !== 'undefined') window.location.assign(loginHref);
                            }}
                          >
                            Sign in
                          </Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : (
                  <CheckoutLayout
                    left={
                      <div className="space-y-6">
                        <CheckoutForm />
                        <Card className="rounded-2xl">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-base">Payment</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Separator className="mb-4" />
                            <PaymentStep />
                          </CardContent>
                        </Card>
                      </div>
                    }
                    right={
                      <div className="lg:sticky lg:top-24">
                        <OrderReview />
                      </div>
                    }
                  />
                )}
              </CheckoutProvider>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
