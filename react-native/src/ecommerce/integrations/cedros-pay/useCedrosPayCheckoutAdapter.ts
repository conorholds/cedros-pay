import * as React from 'react';
import { useStripeCheckout } from '../../../hooks/useStripeCheckout';
import type {
  CheckoutSessionPayload,
  CheckoutSessionResult,
  CommerceAdapter,
} from '../../adapters/CommerceAdapter';
import { parseCheckoutReturn } from '../../hooks/checkoutReturn';

/**
 * Wrap an existing CommerceAdapter and implement `createCheckoutSession` using Cedros Pay's
 * existing Stripe checkout primitive.
 *
 * This keeps the ecommerce layer payment-provider-agnostic while giving apps a ready default
 * integration point when Cedros Pay is already installed.
 */
export function useCedrosPayCheckoutAdapter(base: CommerceAdapter): CommerceAdapter {
  const { processCartCheckout } = useStripeCheckout();

  return React.useMemo(() => {
    return {
      ...base,
      async createCheckoutSession(payload: CheckoutSessionPayload): Promise<CheckoutSessionResult> {
        const result = await processCartCheckout(
          payload.cart,
          payload.options.successUrl,
          payload.options.cancelUrl,
          payload.options.metadata,
          payload.customer.email,
          payload.options.discountCode
        );

        if (!result.success) {
          throw new Error(result.error || 'Checkout failed');
        }

        // Stripe performs the redirect; return a best-effort descriptor.
        return { kind: 'redirect', url: payload.options.successUrl ?? '/' };
      },

      async resolveCheckoutReturn({ query }) {
        // Cedros Pay (Stripe Checkout) commonly returns `session_id` when the caller includes
        // it in the success URL (Stripe placeholder: {CHECKOUT_SESSION_ID}).
        return parseCheckoutReturn(query);
      },
    };
  }, [base, processCartCheckout]);
}
