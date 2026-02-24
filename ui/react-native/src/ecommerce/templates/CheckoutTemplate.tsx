import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { useCedrosShop } from '../config/context';
import { useCart } from '../state/cart/CartProvider';
import { useCheckoutResultFromUrl } from '../hooks/useCheckoutResultFromUrl';
import { CheckoutLayout } from '../components/checkout/CheckoutLayout';
import { CheckoutForm } from '../components/checkout/CheckoutForm';
import { OrderReview } from '../components/checkout/OrderReview';
import { PaymentStep } from '../components/checkout/PaymentStep';
import { CheckoutReceipt } from '../components/checkout/CheckoutReceipt';
import { Separator } from '../components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CheckoutProvider } from '../state/checkout/useCheckout';
import { Button } from '../components/ui/button';

export interface CheckoutTemplateProps {
  style?: ViewStyle;
  onContinueShopping?: () => void;
  onViewOrders?: () => void;
  onLogin?: () => void;
  /**
   * The current URL for parsing checkout result parameters.
   * In React Native, provide this from Linking or deep linking handlers.
   */
  currentUrl?: string | null;
}

export function CheckoutTemplate({
  style,
  onContinueShopping,
  onViewOrders,
  onLogin,
  currentUrl,
}: CheckoutTemplateProps) {
  const { config } = useCedrosShop();
  const cart = useCart();
  const result = useCheckoutResultFromUrl({ url: currentUrl });

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

  return (
    <View style={[styles.container, style]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <CheckoutReceipt
          result={result}
          onContinueShopping={onContinueShopping}
          onViewOrders={onViewOrders}
        />

        {result.kind === 'idle' ? (
          <View style={styles.checkoutContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Checkout</Text>
              <Text style={styles.subtitle}>
                {config.checkout.mode === 'none'
                  ? 'Confirm and pay.'
                  : 'Enter details, then complete payment.'}
              </Text>
            </View>
            <View style={styles.formContainer}>
              <CheckoutProvider>
                {shouldBlockForAuth ? (
                  <Card style={styles.authCard}>
                    <CardHeader>
                      <CardTitle style={styles.authTitle}>Sign in required</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Text style={styles.authText}>
                        This store requires an account to complete checkout.
                      </Text>
                      {onLogin ? (
                        <View style={styles.authButton}>
                          <Button onPress={onLogin}>
                            Sign in
                          </Button>
                        </View>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : (
                  <CheckoutLayout
                    left={
                      <View style={styles.leftColumn}>
                        <CheckoutForm />
                        <Card style={styles.paymentCard}>
                          <CardHeader>
                            <CardTitle style={styles.paymentTitle}>Payment</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Separator style={styles.separator} />
                            <PaymentStep />
                          </CardContent>
                        </Card>
                      </View>
                    }
                    right={
                      <View style={styles.rightColumn}>
                        <OrderReview />
                      </View>
                    }
                  />
                )}
              </CheckoutProvider>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 24,
  },
  checkoutContent: {
    gap: 24,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#171717',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
  },
  formContainer: {
    marginTop: 8,
  },
  authCard: {
    borderRadius: 12,
  },
  authTitle: {
    fontSize: 16,
  },
  authText: {
    fontSize: 14,
    color: '#737373',
  },
  authButton: {
    marginTop: 16,
  },
  leftColumn: {
    gap: 16,
  },
  paymentCard: {
    borderRadius: 12,
  },
  paymentTitle: {
    fontSize: 16,
  },
  separator: {
    marginBottom: 16,
  },
  rightColumn: {
    marginTop: 16,
  },
});
