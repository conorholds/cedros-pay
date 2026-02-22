import * as React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useCedrosShop } from '../../config/context';
import { useCheckout } from '../../state/checkout/useCheckout';
import { useCart } from '../../state/cart/CartProvider';
import { getCartCheckoutRequirements } from '../../utils/cartCheckoutRequirements';
import { useShippingMethods } from '../../hooks/useShippingMethods';
import { AddressForm } from './AddressForm';
import { ContactForm } from './ContactForm';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';

interface CheckoutFormProps {
  style?: ViewStyle;
}

export function CheckoutForm({ style }: CheckoutFormProps) {
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
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      {req.isDigitalOnly ? (
        <Card style={styles.digitalCard}>
          <CardContent>
            <Text style={styles.digitalTitle}>Digital delivery</Text>
            <Text style={styles.digitalText}>
              {req.fulfillmentNotes || 'This is a digital product and will be available from your account after purchase.'}
            </Text>
          </CardContent>
        </Card>
      ) : null}

      {req.hasPhysical && !(config.checkout.allowShipping ?? false) ? (
        <Card style={styles.errorCard}>
          <CardContent>
            <Text style={styles.errorTitle}>Shipping required</Text>
            <Text style={styles.errorText}>
              Your cart contains shippable items, but shipping is disabled for this checkout.
            </Text>
          </CardContent>
        </Card>
      ) : null}

      {showContact ? (
        <ContactForm
          email={checkout.values.email}
          name={checkout.values.name}
          phone={checkout.values.phone}
          onEmailChange={(email) => checkout.setField('email', email)}
          onNameChange={(name) => checkout.setField('name', name)}
          onPhoneChange={(phone) => checkout.setField('phone', phone)}
          emailRequired={req.email === 'required'}
          nameRequired={req.name === 'required'}
          phoneRequired={req.phone === 'required'}
          emailError={checkout.fieldErrors.email}
          nameError={checkout.fieldErrors.name}
          phoneError={checkout.fieldErrors.phone}
        />
      ) : null}

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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tip</Text>
          <View style={styles.fieldContainer}>
            <Label>Tip amount ({config.currency})</Label>
            <Input
              keyboardType="decimal-pad"
              value={String(checkout.values.tipAmount ?? 0)}
              onChangeText={(text: string) => checkout.setField('tipAmount', Number(text) || 0)}
            />
          </View>
        </View>
      ) : null}

      {mode === 'full' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.fieldContainer}>
            <Label>Order notes (optional)</Label>
            <Input
              value={checkout.values.notes ?? ''}
              onChangeText={(text: string) => checkout.setField('notes', text)}
              placeholder="Delivery instructions, gift note..."
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

// Local shipping method selector component
import { ShippingMethod } from '../../types';
import { formatMoney } from '../../utils/money';
import { Button } from '../ui/button';

interface ShippingMethodSelectorProps {
  methods: ShippingMethod[];
  value?: string;
  onChange: (id: string) => void;
  currency: string;
  style?: ViewStyle;
}

function ShippingMethodSelector({
  methods,
  value,
  onChange,
  currency,
  style,
}: ShippingMethodSelectorProps) {
  if (methods.length === 0) return null;
  return (
    <View style={[styles.section, style]}>
      <Text style={styles.sectionTitle}>Shipping method</Text>
      <View style={styles.methodsContainer}>
        {methods.map((m) => {
          const active = m.id === value;
          return (
            <Button
              key={m.id}
              variant={active ? 'default' : 'outline'}
              style={[styles.methodButton, active && styles.methodButtonActive]}
              onPress={() => onChange(m.id)}
            >
              <View style={styles.methodContent}>
                <View style={styles.methodLeft}>
                  <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>
                    {m.label}
                  </Text>
                  {m.detail ? (
                    <Text style={styles.methodDetail}>{m.detail}</Text>
                  ) : null}
                </View>
                <Text style={[styles.methodPrice, active && styles.methodPriceActive]}>
                  {formatMoney({ amount: m.price, currency: m.currency || currency })}
                </Text>
              </View>
            </Button>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
