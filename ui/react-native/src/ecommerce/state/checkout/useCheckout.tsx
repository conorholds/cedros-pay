import React from 'react';
import { Linking } from 'react-native';
import { useCedrosShop } from '../../config/context';
import { useCart } from '../cart/CartProvider';
import { buildCheckoutSchema, type CheckoutFormValues } from './checkoutSchema';
import type { CheckoutSessionResult } from '../../adapters/CommerceAdapter';
import { getCartCheckoutRequirements } from '../../utils/cartCheckoutRequirements';

export type CheckoutStatus = 'idle' | 'validating' | 'creating_session' | 'redirecting' | 'error' | 'success';

export type CheckoutContextValue = {
  values: CheckoutFormValues;
  setValues: React.Dispatch<React.SetStateAction<CheckoutFormValues>>;
  setField: <K extends keyof CheckoutFormValues>(key: K, value: CheckoutFormValues[K]) => void;
  fieldErrors: Record<string, string>;
  status: CheckoutStatus;
  error: string | null;
  session: CheckoutSessionResult | null;
  reset: () => void;
  validate: () => { ok: true; values: CheckoutFormValues } | { ok: false };
  createCheckoutSession: (overrides?: { paymentMethodId?: string }) => Promise<
    | { ok: true; session: CheckoutSessionResult }
    | { ok: false }
  >;
};

const CheckoutContext = React.createContext<CheckoutContextValue | null>(null);

function useCheckoutState(): CheckoutContextValue {
  const { config } = useCedrosShop();
  const cart = useCart();

  const defaultAddress = React.useMemo(
    () => ({
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    }),
    []
  );

  const schema = React.useMemo(
    () => {
      const req = getCartCheckoutRequirements(cart.items, {
        requireEmail: config.checkout.requireEmail ?? true,
        defaultMode: config.checkout.mode,
        allowShipping: config.checkout.allowShipping ?? false,
      });

      return buildCheckoutSchema({
        requireEmail: req.email === 'required',
        requireName: req.name === 'required',
        requirePhone: req.phone === 'required',
        requireShippingAddress: req.shippingAddress,
        requireBillingAddress: req.billingAddress,
      });
    },
    [cart.items, config.checkout.allowShipping, config.checkout.mode, config.checkout.requireEmail]
  );

  const [values, setValues] = React.useState<CheckoutFormValues>(() => ({
    email: (config.checkout.requireEmail ?? true) ? '' : undefined,
    name: '',
    phone: '',
    notes: '',
    shippingAddress:
      config.checkout.mode === 'shipping' || config.checkout.mode === 'full' ? defaultAddress : undefined,
    billingAddress: config.checkout.mode === 'full' ? defaultAddress : undefined,
    discountCode: '',
    tipAmount: 0,
    shippingMethodId: '',
  }));

  React.useEffect(() => {
    const req = getCartCheckoutRequirements(cart.items, {
      requireEmail: config.checkout.requireEmail ?? true,
      defaultMode: config.checkout.mode,
      allowShipping: config.checkout.allowShipping ?? false,
    });

    setValues((prev) => {
      const next = { ...prev };

      if (req.email === 'required' && !next.email) next.email = '';
      if (req.shippingAddress && !next.shippingAddress) next.shippingAddress = defaultAddress;
      if (req.billingAddress && !next.billingAddress) next.billingAddress = defaultAddress;

      if (!req.shippingAddress) next.shippingAddress = undefined;
      if (!req.billingAddress) next.billingAddress = undefined;

      return next;
    });
  }, [cart.items, config.checkout.allowShipping, config.checkout.mode, config.checkout.requireEmail, defaultAddress]);

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<CheckoutStatus>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [session, setSession] = React.useState<CheckoutSessionResult | null>(null);

  const reset = React.useCallback(() => {
    setFieldErrors({});
    setStatus('idle');
    setError(null);
    setSession(null);
  }, []);

  const setField = React.useCallback(<K extends keyof CheckoutFormValues>(key: K, value: CheckoutFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validate = React.useCallback(() => {
    setStatus('validating');
    setError(null);
    const result = schema.safeParse(values);
    if (result.success) {
      setFieldErrors({});
      setStatus('idle');
      return { ok: true as const, values: result.data };
    }
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      next[issue.path.join('.')] = issue.message;
    }
    setFieldErrors(next);
    setStatus('error');
    setError('Please fix the highlighted fields.');
    return { ok: false as const };
  }, [schema, values]);

  const createCheckoutSession = React.useCallback(
    async (overrides?: { paymentMethodId?: string }) => {
      const valid = validate();
      if (!valid.ok) return { ok: false as const };
      setStatus('creating_session');
      setError(null);
      setSession(null);

      const cartItems = cart.items.map((i) => ({
        resource: i.paymentResource ?? i.productId,
        quantity: i.qty,
        variantId: i.variantId,
      }));

       const req = getCartCheckoutRequirements(cart.items, {
         requireEmail: config.checkout.requireEmail ?? true,
         defaultMode: config.checkout.mode,
         allowShipping: config.checkout.allowShipping ?? false,
       });

       const shippingCountries = new Set<string>();
       if (req.shippingAddress) {
         for (const item of cart.items) {
           const raw = item.metadata?.shippingCountries;
           if (!raw) continue;
           for (const part of raw.split(',')) {
             const next = part.trim().toUpperCase();
             if (next) shippingCountries.add(next);
           }
         }
       }

       const checkoutMetadata: Record<string, string> = {
         ...(shippingCountries.size
           ? {
               shippingCountries: Array.from(shippingCountries).join(','),
               shipping_countries: Array.from(shippingCountries).join(','),
             }
           : {}),
       };

      try {
        const created = await config.adapter.createCheckoutSession({
          cart: cartItems,
          customer: {
            email: valid.values.email || undefined,
            name: valid.values.name || undefined,
            phone: valid.values.phone || undefined,
            notes: valid.values.notes || undefined,
            shippingAddress: valid.values.shippingAddress,
            billingAddress: valid.values.billingAddress,
          },
          options: {
            currency: config.currency,
            successUrl: config.checkout.successUrl,
            cancelUrl: config.checkout.cancelUrl,
            allowPromoCodes: config.checkout.allowPromoCodes,
            metadata: Object.keys(checkoutMetadata).length ? checkoutMetadata : undefined,
            discountCode:
              (config.checkout.allowPromoCodes
                ? (valid.values.discountCode || cart.promoCode)
                : undefined) || undefined,
            tipAmount: config.checkout.allowTipping ? (valid.values.tipAmount || undefined) : undefined,
            shippingMethodId: config.checkout.allowShipping
              ? (valid.values.shippingMethodId || undefined)
              : undefined,
            paymentMethodId: overrides?.paymentMethodId,
          },
        });

        if (created.kind === 'redirect') {
          setSession(created);
          setStatus('redirecting');
          await Linking.openURL(created.url);
          return { ok: true as const, session: created };
        }

        setSession(created);
        setStatus('success');
        return { ok: true as const, session: created };
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Checkout failed');
        return { ok: false as const };
      }
    },
    [cart.items, cart.promoCode, config.adapter, config.checkout, config.currency, validate]
  );

  return {
    values,
    setValues,
    setField,
    fieldErrors,
    status,
    error,
    session,
    reset,
    validate,
    createCheckoutSession,
  };
}

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const value = useCheckoutState();
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout(): CheckoutContextValue {
  const value = React.useContext(CheckoutContext);
  if (!value) {
    throw new Error('useCheckout must be used within CheckoutProvider');
  }
  return value;
}

// For advanced usage where you want local state without a provider.
export function useStandaloneCheckout() {
  return useCheckoutState();
}
