import type { CheckoutResult } from '../../hooks/useCheckoutResultFromUrl';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Button } from '../ui/button';
import { formatMoney } from '../../utils/money';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';

interface CheckoutReceiptProps {
  result: CheckoutResult;
  onContinueShopping?: () => void;
  onViewOrders?: () => void;
  style?: ViewStyle;
}

export function CheckoutReceipt({
  result,
  onContinueShopping,
  onViewOrders,
  style,
}: CheckoutReceiptProps) {
  if (result.kind === 'idle') return null;

  if (result.kind === 'success') {
    return (
      <Card style={[styles.container, style]}>
        <CardContent>
          <Text style={styles.receiptLabel}>Receipt</Text>
          <Text style={styles.successTitle}>Payment successful</Text>
          <Text style={styles.successDescription}>
            Thanks for your purchase. You'll receive a confirmation email shortly.
          </Text>

          {result.order ? (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>Order {result.order.id}</Text>
                  <Text style={styles.orderMeta}>
                    {new Date(result.order.createdAt).toLocaleString()} · {result.order.status}
                  </Text>
                </View>
                <Text style={styles.orderTotal}>
                  {formatMoney({ amount: result.order.total, currency: result.order.currency })}
                </Text>
              </View>

              <Separator style={styles.orderSeparator} />

              <View style={styles.itemsContainer}>
                {result.order.items.slice(0, 4).map((it, idx) => (
                  <View key={`${it.title}-${idx}`} style={styles.itemRow}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {it.title}
                    </Text>
                    <Text style={styles.itemQty}>Qty {it.qty}</Text>
                  </View>
                ))}
                {result.order.items.length > 4 ? (
                  <Text style={styles.moreItems}>
                    +{result.order.items.length - 4} more item(s)
                  </Text>
                ) : null}
              </View>

              {(result.order.receiptUrl || result.order.invoiceUrl) ? (
                <>
                  <Separator style={styles.orderSeparator} />
                  <View style={styles.linksContainer}>
                    {result.order.receiptUrl ? (
                      <TouchableOpacity>
                        <Text style={styles.link}>Receipt</Text>
                      </TouchableOpacity>
                    ) : null}
                    {result.order.invoiceUrl ? (
                      <TouchableOpacity>
                        <Text style={styles.link}>Invoice</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </>
              ) : null}
            </View>
          ) : result.orderId ? (
            <Text style={styles.sessionId}>
              Session/Order ID: <Text style={styles.mono}>{result.orderId}</Text>
            </Text>
          ) : null}

          <View style={styles.buttonContainer}>
            {onContinueShopping ? (
              <Button onPress={onContinueShopping}>
                Continue shopping
              </Button>
            ) : null}
            {onViewOrders ? (
              <Button variant="outline" onPress={onViewOrders}>
                View orders
              </Button>
            ) : null}
          </View>
        </CardContent>
      </Card>
    );
  }

  if (result.kind === 'cancel') {
    return (
      <Card style={[styles.container, style]}>
        <CardContent>
          <Text style={styles.cancelTitle}>Checkout cancelled</Text>
          <Text style={styles.cancelDescription}>
            No charges were made. You can continue shopping and try again.
          </Text>
          {onContinueShopping ? (
            <View style={styles.singleButtonContainer}>
              <Button onPress={onContinueShopping}>
                Back to shop
              </Button>
            </View>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={[styles.container, style]}>
      <CardContent>
        <Text style={styles.errorTitle}>Payment failed</Text>
        <Text style={styles.errorDescription}>
          {result.message ?? 'Something went wrong while processing your payment.'}
        </Text>
        {onContinueShopping ? (
          <View style={styles.singleButtonContainer}>
            <Button onPress={onContinueShopping}>
              Back to shop
            </Button>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  receiptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 14,
    color: '#737373',
    lineHeight: 20,
    marginBottom: 20,
  },
  orderCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 16,
    marginBottom: 24,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  orderMeta: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginLeft: 8,
  },
  orderSeparator: {
    marginVertical: 12,
  },
  itemsContainer: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    color: '#171717',
    marginRight: 8,
  },
  itemQty: {
    fontSize: 12,
    color: '#737373',
  },
  moreItems: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
  },
  linksContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  link: {
    fontSize: 14,
    color: '#171717',
    textDecorationLine: 'underline',
  },
  sessionId: {
    fontSize: 12,
    color: '#a3a3a3',
    marginBottom: 24,
  },
  mono: {
    fontFamily: 'monospace',
  },
  buttonContainer: {
    gap: 8,
  },
  singleButtonContainer: {
    marginTop: 24,
  },
  cancelTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 8,
  },
  cancelDescription: {
    fontSize: 14,
    color: '#737373',
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: '#737373',
    lineHeight: 20,
  },
});
