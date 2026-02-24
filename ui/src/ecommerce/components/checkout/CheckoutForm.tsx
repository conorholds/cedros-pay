import * as React from 'react';
import { useCedrosShop } from '../../config/context';
import { useCheckout } from '../../state/checkout/useCheckout';
import { useCart } from '../../state/cart/CartProvider';
import { cn } from '../../utils/cn';
import { getCartCheckoutRequirements } from '../../utils/cartCheckoutRequirements';
import { useShippingMethods } from '../../hooks/useShippingMethods';
import { AddressForm } from './AddressForm';
import { ShippingMethodSelector } from './ShippingMethodSelector';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="text-xs text-red-600">{message}</div>;
}

export function CheckoutForm({ className }: { className?: string }) {
  const { config } = useCedrosShop();
  const checkout = useCheckout();
  const cart = useCart();

  const mode = config.checkout.mode;
  const req = React.useMemo(
    () =>
      getCartCheckoutRequirements(cart.items, {
        requireEmail: config.checkout.requireEmail ?? true,
        defaultMode: mode,
        allowShipping: config.checkout.allowShipping ?? false,
      }),
    [cart.items, config.checkout.allowShipping, config.checkout.requireEmail, mode]
  );

  const wantsShipping =
    (config.checkout.allowShipping ?? false) && req.shippingAddress && (mode === 'shipping' || mode === 'full');

  const showContact = req.email !== 'none' || req.name !== 'none' || req.phone !== 'none';

  const defaultAddress = {
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  };

  const shippingAddress = checkout.values.shippingAddress ?? defaultAddress;
  const billingAddress = checkout.values.billingAddress ?? defaultAddress;

  const shippingMethods = useShippingMethods({
    enabled: Boolean(config.adapter.getShippingMethods) && wantsShipping,
    customer: {
      email: checkout.values.email || undefined,
      name: checkout.values.name || undefined,
      shippingAddress,
    },
  });

  return (
    <form className={cn('space-y-6', className)} onSubmit={(e) => e.preventDefault()}>
      {req.isDigitalOnly ? (
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Digital delivery</div>
            <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {req.fulfillmentNotes || 'This is a digital product and will be available from your account after purchase.'}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {req.hasPhysical && !(config.checkout.allowShipping ?? false) ? (
        <Card className="rounded-2xl border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-red-900 dark:text-red-200">Shipping required</div>
            <div className="mt-1 text-sm text-red-800/90 dark:text-red-200/80">
              Your cart contains shippable items, but shipping is disabled for this checkout.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!showContact ? null : (
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Contact</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {req.email === 'required' || req.name === 'required' || req.phone === 'required' ? 'Required' : 'Optional'}
            </div>
          </div>
          <div className="grid gap-3">
            {req.email !== 'none' ? (
              <div className="grid gap-2">
                <Label htmlFor="checkout-email">Email</Label>
                <Input
                  id="checkout-email"
                  value={checkout.values.email ?? ''}
                  onChange={(e) => checkout.setField('email', e.target.value)}
                  placeholder="you@company.com"
                  aria-invalid={Boolean(checkout.fieldErrors.email)}
                  required={req.email === 'required'}
                />
                <FieldError message={checkout.fieldErrors.email} />
              </div>
            ) : null}
            {req.name !== 'none' ? (
              <div className="grid gap-2">
                <Label htmlFor="checkout-name">Name</Label>
                <Input
                  id="checkout-name"
                  value={checkout.values.name ?? ''}
                  onChange={(e) => checkout.setField('name', e.target.value)}
                  placeholder="Full name"
                  aria-invalid={Boolean(checkout.fieldErrors.name)}
                  required={req.name === 'required'}
                />
                <FieldError message={checkout.fieldErrors.name} />
              </div>
            ) : null}
            {req.phone !== 'none' ? (
              <div className="grid gap-2">
                <Label htmlFor="checkout-phone">Phone</Label>
                <Input
                  id="checkout-phone"
                  value={checkout.values.phone ?? ''}
                  onChange={(e) => checkout.setField('phone', e.target.value)}
                  placeholder="Phone number"
                  aria-invalid={Boolean(checkout.fieldErrors.phone)}
                  required={req.phone === 'required'}
                />
                <FieldError message={checkout.fieldErrors.phone} />
              </div>
            ) : null}
          </div>
        </section>
      )}

      {wantsShipping ? (
        <AddressForm
          title="Shipping address"
          value={shippingAddress}
          onChange={(next) => checkout.setField('shippingAddress', next)}
          errors={{
            line1: checkout.fieldErrors['shippingAddress.line1'],
            city: checkout.fieldErrors['shippingAddress.city'],
            postalCode: checkout.fieldErrors['shippingAddress.postalCode'],
            country: checkout.fieldErrors['shippingAddress.country'],
          }}
        />
      ) : null}

      {wantsShipping && shippingMethods.methods.length ? (
        <ShippingMethodSelector
          methods={shippingMethods.methods}
          value={checkout.values.shippingMethodId}
          onChange={(id) => checkout.setField('shippingMethodId', id)}
          currency={config.currency}
        />
      ) : null}

      {mode === 'full' ? (
        <AddressForm
          title="Billing address"
          value={billingAddress}
          onChange={(next) => checkout.setField('billingAddress', next)}
        />
      ) : null}

      {config.checkout.allowTipping ? (
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Tip</div>
          <div className="grid gap-2">
            <Label htmlFor="checkout-tip">Tip amount ({config.currency})</Label>
            <Input
              id="checkout-tip"
              inputMode="decimal"
              value={String(checkout.values.tipAmount ?? 0)}
              onChange={(e) => checkout.setField('tipAmount', Number(e.target.value) || 0)}
            />
          </div>
        </section>
      ) : null}

      {mode === 'full' ? (
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Notes</div>
          <div className="grid gap-2">
            <Label htmlFor="checkout-notes">Order notes (optional)</Label>
            <Input
              id="checkout-notes"
              value={checkout.values.notes ?? ''}
              onChange={(e) => checkout.setField('notes', e.target.value)}
              placeholder="Delivery instructions, gift note…"
            />
          </div>
        </section>
      ) : null}
    </form>
  );
}
