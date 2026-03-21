"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutProvider = CheckoutProvider;
exports.useCheckout = useCheckout;
exports.useStandaloneCheckout = useStandaloneCheckout;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../../config/context");
const CartProvider_1 = require("../cart/CartProvider");
const checkoutSchema_1 = require("./checkoutSchema");
const cartCheckoutRequirements_1 = require("../../utils/cartCheckoutRequirements");
const CheckoutContext = react_1.default.createContext(null);
function useCheckoutState() {
    const { config } = (0, context_1.useCedrosShop)();
    const cart = (0, CartProvider_1.useCart)();
    const defaultAddress = react_1.default.useMemo(() => ({
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
    }), []);
    const schema = react_1.default.useMemo(() => {
        const req = (0, cartCheckoutRequirements_1.getCartCheckoutRequirements)(cart.items, {
            requireEmail: config.checkout.requireEmail ?? true,
            defaultMode: config.checkout.mode,
            allowShipping: config.checkout.allowShipping ?? false,
        });
        return (0, checkoutSchema_1.buildCheckoutSchema)({
            requireEmail: req.email === 'required',
            requireName: req.name === 'required',
            requirePhone: req.phone === 'required',
            requireShippingAddress: req.shippingAddress,
            requireBillingAddress: req.billingAddress,
        });
    }, [cart.items, config.checkout.allowShipping, config.checkout.mode, config.checkout.requireEmail]);
    const [values, setValues] = react_1.default.useState(() => ({
        email: (config.checkout.requireEmail ?? true) ? '' : undefined,
        name: '',
        phone: '',
        notes: '',
        shippingAddress: config.checkout.mode === 'shipping' || config.checkout.mode === 'full' ? defaultAddress : undefined,
        billingAddress: config.checkout.mode === 'full' ? defaultAddress : undefined,
        discountCode: '',
        tipAmount: 0,
        shippingMethodId: '',
    }));
    react_1.default.useEffect(() => {
        const req = (0, cartCheckoutRequirements_1.getCartCheckoutRequirements)(cart.items, {
            requireEmail: config.checkout.requireEmail ?? true,
            defaultMode: config.checkout.mode,
            allowShipping: config.checkout.allowShipping ?? false,
        });
        setValues((prev) => {
            const next = { ...prev };
            if (req.email === 'required' && !next.email)
                next.email = '';
            if (req.shippingAddress && !next.shippingAddress)
                next.shippingAddress = defaultAddress;
            if (req.billingAddress && !next.billingAddress)
                next.billingAddress = defaultAddress;
            if (!req.shippingAddress)
                next.shippingAddress = undefined;
            if (!req.billingAddress)
                next.billingAddress = undefined;
            return next;
        });
    }, [cart.items, config.checkout.allowShipping, config.checkout.mode, config.checkout.requireEmail, defaultAddress]);
    const [fieldErrors, setFieldErrors] = react_1.default.useState({});
    const [status, setStatus] = react_1.default.useState('idle');
    const [error, setError] = react_1.default.useState(null);
    const [session, setSession] = react_1.default.useState(null);
    const reset = react_1.default.useCallback(() => {
        setFieldErrors({});
        setStatus('idle');
        setError(null);
        setSession(null);
    }, []);
    const setField = react_1.default.useCallback((key, value) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    }, []);
    const validate = react_1.default.useCallback(() => {
        setStatus('validating');
        setError(null);
        const result = schema.safeParse(values);
        if (result.success) {
            setFieldErrors({});
            setStatus('idle');
            return { ok: true, values: result.data };
        }
        const next = {};
        for (const issue of result.error.issues) {
            next[issue.path.join('.')] = issue.message;
        }
        setFieldErrors(next);
        setStatus('error');
        setError('Please fix the highlighted fields.');
        return { ok: false };
    }, [schema, values]);
    const createCheckoutSession = react_1.default.useCallback(async (overrides) => {
        const valid = validate();
        if (!valid.ok)
            return { ok: false };
        setStatus('creating_session');
        setError(null);
        setSession(null);
        const cartItems = cart.items.map((i) => ({
            resource: i.paymentResource ?? i.productId,
            quantity: i.qty,
            variantId: i.variantId,
        }));
        const req = (0, cartCheckoutRequirements_1.getCartCheckoutRequirements)(cart.items, {
            requireEmail: config.checkout.requireEmail ?? true,
            defaultMode: config.checkout.mode,
            allowShipping: config.checkout.allowShipping ?? false,
        });
        const shippingCountries = new Set();
        if (req.shippingAddress) {
            for (const item of cart.items) {
                const raw = item.metadata?.shippingCountries;
                if (!raw)
                    continue;
                for (const part of raw.split(',')) {
                    const next = part.trim().toUpperCase();
                    if (next)
                        shippingCountries.add(next);
                }
            }
        }
        const checkoutMetadata = {
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
                    discountCode: (config.checkout.allowPromoCodes
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
                await react_native_1.Linking.openURL(created.url);
                return { ok: true, session: created };
            }
            setSession(created);
            setStatus('success');
            return { ok: true, session: created };
        }
        catch (e) {
            setStatus('error');
            setError(e instanceof Error ? e.message : 'Checkout failed');
            return { ok: false };
        }
    }, [cart.items, cart.promoCode, config.adapter, config.checkout, config.currency, validate]);
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
function CheckoutProvider({ children }) {
    const value = useCheckoutState();
    return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}
function useCheckout() {
    const value = react_1.default.useContext(CheckoutContext);
    if (!value) {
        throw new Error('useCheckout must be used within CheckoutProvider');
    }
    return value;
}
// For advanced usage where you want local state without a provider.
function useStandaloneCheckout() {
    return useCheckoutState();
}
//# sourceMappingURL=useCheckout.js.map