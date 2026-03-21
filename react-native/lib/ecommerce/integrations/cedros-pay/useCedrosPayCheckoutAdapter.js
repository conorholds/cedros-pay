"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCedrosPayCheckoutAdapter = useCedrosPayCheckoutAdapter;
const React = __importStar(require("react"));
const useStripeCheckout_1 = require("../../../hooks/useStripeCheckout");
const checkoutReturn_1 = require("../../hooks/checkoutReturn");
/**
 * Wrap an existing CommerceAdapter and implement `createCheckoutSession` using Cedros Pay's
 * existing Stripe checkout primitive.
 *
 * This keeps the ecommerce layer payment-provider-agnostic while giving apps a ready default
 * integration point when Cedros Pay is already installed.
 */
function useCedrosPayCheckoutAdapter(base) {
    const { processCartCheckout } = (0, useStripeCheckout_1.useStripeCheckout)();
    return React.useMemo(() => {
        return {
            ...base,
            async createCheckoutSession(payload) {
                const result = await processCartCheckout(payload.cart, payload.options.successUrl, payload.options.cancelUrl, payload.options.metadata, payload.customer.email, payload.options.discountCode);
                if (!result.success) {
                    throw new Error(result.error || 'Checkout failed');
                }
                // Stripe performs the redirect; return a best-effort descriptor.
                return { kind: 'redirect', url: payload.options.successUrl ?? '/' };
            },
            async resolveCheckoutReturn({ query }) {
                // Cedros Pay (Stripe Checkout) commonly returns `session_id` when the caller includes
                // it in the success URL (Stripe placeholder: {CHECKOUT_SESSION_ID}).
                return (0, checkoutReturn_1.parseCheckoutReturn)(query);
            },
        };
    }, [base, processCartCheckout]);
}
//# sourceMappingURL=useCedrosPayCheckoutAdapter.js.map