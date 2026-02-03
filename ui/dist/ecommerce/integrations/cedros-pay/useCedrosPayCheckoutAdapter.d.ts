import { CommerceAdapter } from '../../adapters/CommerceAdapter';
/**
 * Wrap an existing CommerceAdapter and implement `createCheckoutSession` using Cedros Pay's
 * existing Stripe checkout primitive.
 *
 * This keeps the ecommerce layer payment-provider-agnostic while giving apps a ready default
 * integration point when Cedros Pay is already installed.
 */
export declare function useCedrosPayCheckoutAdapter(base: CommerceAdapter): CommerceAdapter;
//# sourceMappingURL=useCedrosPayCheckoutAdapter.d.ts.map