"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckoutReceipt = CheckoutReceipt;
const react_native_1 = require("react-native");
const button_1 = require("../ui/button");
const money_1 = require("../../utils/money");
const card_1 = require("../ui/card");
const separator_1 = require("../ui/separator");
function CheckoutReceipt({ result, onContinueShopping, onViewOrders, style, }) {
    if (result.kind === 'idle')
        return null;
    if (result.kind === 'success') {
        return (<card_1.Card style={[styles.container, style]}>
        <card_1.CardContent>
          <react_native_1.Text style={styles.receiptLabel}>Receipt</react_native_1.Text>
          <react_native_1.Text style={styles.successTitle}>Payment successful</react_native_1.Text>
          <react_native_1.Text style={styles.successDescription}>
            Thanks for your purchase. You'll receive a confirmation email shortly.
          </react_native_1.Text>

          {result.order ? (<react_native_1.View style={styles.orderCard}>
              <react_native_1.View style={styles.orderHeader}>
                <react_native_1.View style={styles.orderInfo}>
                  <react_native_1.Text style={styles.orderId}>Order {result.order.id}</react_native_1.Text>
                  <react_native_1.Text style={styles.orderMeta}>
                    {new Date(result.order.createdAt).toLocaleString()} · {result.order.status}
                  </react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Text style={styles.orderTotal}>
                  {(0, money_1.formatMoney)({ amount: result.order.total, currency: result.order.currency })}
                </react_native_1.Text>
              </react_native_1.View>

              <separator_1.Separator style={styles.orderSeparator}/>

              <react_native_1.View style={styles.itemsContainer}>
                {result.order.items.slice(0, 4).map((it, idx) => (<react_native_1.View key={`${it.title}-${idx}`} style={styles.itemRow}>
                    <react_native_1.Text style={styles.itemTitle} numberOfLines={1}>
                      {it.title}
                    </react_native_1.Text>
                    <react_native_1.Text style={styles.itemQty}>Qty {it.qty}</react_native_1.Text>
                  </react_native_1.View>))}
                {result.order.items.length > 4 ? (<react_native_1.Text style={styles.moreItems}>
                    +{result.order.items.length - 4} more item(s)
                  </react_native_1.Text>) : null}
              </react_native_1.View>

              {(result.order.receiptUrl || result.order.invoiceUrl) ? (<>
                  <separator_1.Separator style={styles.orderSeparator}/>
                  <react_native_1.View style={styles.linksContainer}>
                    {result.order.receiptUrl ? (<react_native_1.TouchableOpacity>
                        <react_native_1.Text style={styles.link}>Receipt</react_native_1.Text>
                      </react_native_1.TouchableOpacity>) : null}
                    {result.order.invoiceUrl ? (<react_native_1.TouchableOpacity>
                        <react_native_1.Text style={styles.link}>Invoice</react_native_1.Text>
                      </react_native_1.TouchableOpacity>) : null}
                  </react_native_1.View>
                </>) : null}
            </react_native_1.View>) : result.orderId ? (<react_native_1.Text style={styles.sessionId}>
              Session/Order ID: <react_native_1.Text style={styles.mono}>{result.orderId}</react_native_1.Text>
            </react_native_1.Text>) : null}

          <react_native_1.View style={styles.buttonContainer}>
            {onContinueShopping ? (<button_1.Button onPress={onContinueShopping}>
                Continue shopping
              </button_1.Button>) : null}
            {onViewOrders ? (<button_1.Button variant="outline" onPress={onViewOrders}>
                View orders
              </button_1.Button>) : null}
          </react_native_1.View>
        </card_1.CardContent>
      </card_1.Card>);
    }
    if (result.kind === 'cancel') {
        return (<card_1.Card style={[styles.container, style]}>
        <card_1.CardContent>
          <react_native_1.Text style={styles.cancelTitle}>Checkout cancelled</react_native_1.Text>
          <react_native_1.Text style={styles.cancelDescription}>
            No charges were made. You can continue shopping and try again.
          </react_native_1.Text>
          {onContinueShopping ? (<react_native_1.View style={styles.singleButtonContainer}>
              <button_1.Button onPress={onContinueShopping}>
                Back to shop
              </button_1.Button>
            </react_native_1.View>) : null}
        </card_1.CardContent>
      </card_1.Card>);
    }
    return (<card_1.Card style={[styles.container, style]}>
      <card_1.CardContent>
        <react_native_1.Text style={styles.errorTitle}>Payment failed</react_native_1.Text>
        <react_native_1.Text style={styles.errorDescription}>
          {result.message ?? 'Something went wrong while processing your payment.'}
        </react_native_1.Text>
        {onContinueShopping ? (<react_native_1.View style={styles.singleButtonContainer}>
            <button_1.Button onPress={onContinueShopping}>
              Back to shop
            </button_1.Button>
          </react_native_1.View>) : null}
      </card_1.CardContent>
    </card_1.Card>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=CheckoutReceipt.js.map