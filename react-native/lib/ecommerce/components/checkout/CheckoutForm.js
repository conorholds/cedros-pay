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
exports.CheckoutForm = CheckoutForm;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../../config/context");
const useCheckout_1 = require("../../state/checkout/useCheckout");
const CartProvider_1 = require("../../state/cart/CartProvider");
const cartCheckoutRequirements_1 = require("../../utils/cartCheckoutRequirements");
const useShippingMethods_1 = require("../../hooks/useShippingMethods");
const AddressForm_1 = require("./AddressForm");
const ContactForm_1 = require("./ContactForm");
const input_1 = require("../ui/input");
const label_1 = require("../ui/label");
const card_1 = require("../ui/card");
function CheckoutForm({ style }) {
    const { config } = (0, context_1.useCedrosShop)();
    const checkout = (0, useCheckout_1.useCheckout)();
    const cart = (0, CartProvider_1.useCart)();
    const mode = config.checkout.mode;
    const req = React.useMemo(() => (0, cartCheckoutRequirements_1.getCartCheckoutRequirements)(cart.items, {
        requireEmail: config.checkout.requireEmail ?? true,
        defaultMode: mode,
        allowShipping: config.checkout.allowShipping ?? false,
    }), [cart.items, config.checkout.allowShipping, config.checkout.requireEmail, mode]);
    const wantsShipping = (config.checkout.allowShipping ?? false) && req.shippingAddress && (mode === 'shipping' || mode === 'full');
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
    const shippingMethods = (0, useShippingMethods_1.useShippingMethods)({
        enabled: Boolean(config.adapter.getShippingMethods) && wantsShipping,
        customer: {
            email: checkout.values.email || undefined,
            name: checkout.values.name || undefined,
            shippingAddress,
        },
    });
    return (<react_native_1.ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      {req.isDigitalOnly ? (<card_1.Card style={styles.digitalCard}>
          <card_1.CardContent>
            <react_native_1.Text style={styles.digitalTitle}>Digital delivery</react_native_1.Text>
            <react_native_1.Text style={styles.digitalText}>
              {req.fulfillmentNotes || 'This is a digital product and will be available from your account after purchase.'}
            </react_native_1.Text>
          </card_1.CardContent>
        </card_1.Card>) : null}

      {req.hasPhysical && !(config.checkout.allowShipping ?? false) ? (<card_1.Card style={styles.errorCard}>
          <card_1.CardContent>
            <react_native_1.Text style={styles.errorTitle}>Shipping required</react_native_1.Text>
            <react_native_1.Text style={styles.errorText}>
              Your cart contains shippable items, but shipping is disabled for this checkout.
            </react_native_1.Text>
          </card_1.CardContent>
        </card_1.Card>) : null}

      {showContact ? (<ContactForm_1.ContactForm email={checkout.values.email} name={checkout.values.name} phone={checkout.values.phone} onEmailChange={(email) => checkout.setField('email', email)} onNameChange={(name) => checkout.setField('name', name)} onPhoneChange={(phone) => checkout.setField('phone', phone)} emailRequired={req.email === 'required'} nameRequired={req.name === 'required'} phoneRequired={req.phone === 'required'} emailError={checkout.fieldErrors.email} nameError={checkout.fieldErrors.name} phoneError={checkout.fieldErrors.phone}/>) : null}

      {wantsShipping ? (<AddressForm_1.AddressForm title="Shipping address" value={shippingAddress} onChange={(next) => checkout.setField('shippingAddress', next)} errors={{
                line1: checkout.fieldErrors['shippingAddress.line1'],
                city: checkout.fieldErrors['shippingAddress.city'],
                postalCode: checkout.fieldErrors['shippingAddress.postalCode'],
                country: checkout.fieldErrors['shippingAddress.country'],
            }}/>) : null}

      {wantsShipping && shippingMethods.methods.length ? (<ShippingMethodSelector methods={shippingMethods.methods} value={checkout.values.shippingMethodId} onChange={(id) => checkout.setField('shippingMethodId', id)} currency={config.currency}/>) : null}

      {mode === 'full' ? (<AddressForm_1.AddressForm title="Billing address" value={billingAddress} onChange={(next) => checkout.setField('billingAddress', next)}/>) : null}

      {config.checkout.allowTipping ? (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionTitle}>Tip</react_native_1.Text>
          <react_native_1.View style={styles.fieldContainer}>
            <label_1.Label>Tip amount ({config.currency})</label_1.Label>
            <input_1.Input keyboardType="decimal-pad" value={String(checkout.values.tipAmount ?? 0)} onChangeText={(text) => checkout.setField('tipAmount', Number(text) || 0)}/>
          </react_native_1.View>
        </react_native_1.View>) : null}

      {mode === 'full' ? (<react_native_1.View style={styles.section}>
          <react_native_1.Text style={styles.sectionTitle}>Notes</react_native_1.Text>
          <react_native_1.View style={styles.fieldContainer}>
            <label_1.Label>Order notes (optional)</label_1.Label>
            <input_1.Input value={checkout.values.notes ?? ''} onChangeText={(text) => checkout.setField('notes', text)} placeholder="Delivery instructions, gift note..."/>
          </react_native_1.View>
        </react_native_1.View>) : null}
    </react_native_1.ScrollView>);
}
const money_1 = require("../../utils/money");
const button_1 = require("../ui/button");
function ShippingMethodSelector({ methods, value, onChange, currency, style, }) {
    if (methods.length === 0)
        return null;
    return (<react_native_1.View style={[styles.section, style]}>
      <react_native_1.Text style={styles.sectionTitle}>Shipping method</react_native_1.Text>
      <react_native_1.View style={styles.methodsContainer}>
        {methods.map((m) => {
            const active = m.id === value;
            return (<button_1.Button key={m.id} variant={active ? 'default' : 'outline'} style={[styles.methodButton, active && styles.methodButtonActive]} onPress={() => onChange(m.id)}>
              <react_native_1.View style={styles.methodContent}>
                <react_native_1.View style={styles.methodLeft}>
                  <react_native_1.Text style={[styles.methodLabel, active && styles.methodLabelActive]}>
                    {m.label}
                  </react_native_1.Text>
                  {m.detail ? (<react_native_1.Text style={styles.methodDetail}>{m.detail}</react_native_1.Text>) : null}
                </react_native_1.View>
                <react_native_1.Text style={[styles.methodPrice, active && styles.methodPriceActive]}>
                  {(0, money_1.formatMoney)({ amount: m.price, currency: m.currency || currency })}
                </react_native_1.Text>
              </react_native_1.View>
            </button_1.Button>);
        })}
      </react_native_1.View>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
    digitalCard: {
        marginBottom: 16,
    },
    digitalTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
        marginBottom: 4,
    },
    digitalText: {
        fontSize: 14,
        color: '#737373',
        lineHeight: 20,
    },
    errorCard: {
        marginBottom: 16,
        borderColor: '#fca5a5',
        backgroundColor: '#fef2f2',
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7f1d1d',
        marginBottom: 4,
    },
    errorText: {
        fontSize: 14,
        color: '#991b1b',
        lineHeight: 20,
    },
    section: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
        marginBottom: 12,
    },
    fieldContainer: {
        gap: 4,
    },
    fieldError: {
        fontSize: 12,
        color: '#dc2626',
        marginTop: 4,
    },
    methodsContainer: {
        gap: 8,
    },
    methodButton: {
        height: 'auto',
        paddingVertical: 12,
        paddingHorizontal: 16,
        justifyContent: 'flex-start',
    },
    methodButtonActive: {
        borderColor: '#171717',
    },
    methodContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    methodLeft: {
        flex: 1,
    },
    methodLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
    },
    methodLabelActive: {
        color: '#ffffff',
    },
    methodDetail: {
        fontSize: 12,
        color: '#737373',
        marginTop: 2,
        opacity: 0.8,
    },
    methodPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#171717',
    },
    methodPriceActive: {
        color: '#ffffff',
    },
});
//# sourceMappingURL=CheckoutForm.js.map