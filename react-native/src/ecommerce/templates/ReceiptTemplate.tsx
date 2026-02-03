import * as React from 'react';
import { View, Text, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { formatMoney } from '../utils/money';
import { useCedrosShop } from '../config/context';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import type { Order } from '../types';

export interface ReceiptTemplateProps {
  /** The order to display */
  order: Order;
  /** Override payment source (defaults to order.source) */
  source?: 'stripe' | 'x402' | 'credits';
  /** Override purchase ID (defaults to order.purchaseId) */
  purchaseId?: string;
  /** Override customer email (defaults to order.customerEmail) */
  customerEmail?: string;
  /** Override customer name (defaults to order.customerName) */
  customerName?: string;
  /** Additional style */
  style?: ViewStyle;
  /** Callback to go back */
  onBack?: () => void;
  /** Callback when print is requested */
  onPrint?: () => void;
}

function sourceLabel(source?: string): string {
  switch (source) {
    case 'x402':
      return 'Crypto (x402)';
    case 'credits':
      return 'Credits';
    case 'stripe':
      return 'Card';
    default:
      return 'Payment';
  }
}

export function ReceiptTemplate({
  order,
  source,
  purchaseId,
  customerEmail,
  customerName,
  style,
  onBack,
  onPrint,
}: ReceiptTemplateProps) {
  const { config } = useCedrosShop();

  // Use props or fall back to order fields
  const resolvedSource = source ?? order.source;
  const resolvedPurchaseId = purchaseId ?? order.purchaseId;
  const resolvedEmail = customerEmail ?? order.customerEmail;
  const resolvedName = customerName ?? order.customerName;
  const brandName = config.brand?.name ?? 'Store';

  const formattedDate = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(order.createdAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {onBack ? (
            <Button variant="ghost" size="sm" onPress={onBack}>
              ← Back
            </Button>
          ) : (
            <View />
          )}
          {onPrint && (
            <Button variant="outline" size="sm" onPress={onPrint}>
              🖨️ Print Receipt
            </Button>
          )}
        </View>
      </View>

      {/* Receipt Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.receiptCard}>
          <CardContent style={styles.receiptContent}>
            {/* Brand Header */}
            <View style={styles.brandHeader}>
              <View style={styles.brandInfo}>
                <Text style={styles.brandName}>{brandName}</Text>
              </View>
              <View style={styles.receiptInfo}>
                <Text style={styles.receiptLabel}>Receipt</Text>
                <Text style={styles.receiptId}>{order.id}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Order Meta */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
                <Text style={styles.metaSubtext}>{formattedTime}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Payment Method</Text>
                <Text style={styles.metaValue}>
                  {sourceLabel(resolvedSource)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Status</Text>
                <View style={styles.badgeContainer}>
                  <Badge variant="outline">
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </View>
              </View>
            </View>

            {/* Customer Info */}
            {(resolvedName || resolvedEmail) && (
              <>
                <View style={styles.divider} />
                <View style={styles.customerSection}>
                  <Text style={styles.metaLabel}>Customer</Text>
                  {resolvedName && (
                    <Text style={styles.customerName}>{resolvedName}</Text>
                  )}
                  {resolvedEmail && (
                    <Text style={styles.customerEmail}>{resolvedEmail}</Text>
                  )}
                </View>
              </>
            )}

            {/* Line Items */}
            <View style={styles.divider} />
            <View style={styles.itemsSection}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Item</Text>
                <Text style={[styles.tableHeaderText, { width: 50, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.tableHeaderText, { width: 80, textAlign: 'right' }]}>Price</Text>
              </View>
              {order.items.map((item, idx) => (
                <View key={`${item.title}-${idx}`} style={styles.tableRow}>
                  <Text style={[styles.itemTitle, { flex: 1 }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.itemQty, { width: 50, textAlign: 'center' }]}>
                    {item.qty}
                  </Text>
                  <Text style={[styles.itemPrice, { width: 80, textAlign: 'right' }]}>
                    {formatMoney({ amount: item.unitPrice * item.qty, currency: item.currency })}
                  </Text>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={styles.divider} />
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>
                  {formatMoney({ amount: order.total, currency: order.currency })}
                </Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>
                  {formatMoney({ amount: order.total, currency: order.currency })}
                </Text>
              </View>
            </View>

            {/* Transaction ID */}
            {resolvedPurchaseId && (
              <>
                <View style={styles.divider} />
                <View style={styles.transactionSection}>
                  <Text style={styles.metaLabel}>Transaction ID</Text>
                  <Text style={styles.transactionId} numberOfLines={2}>
                    {resolvedPurchaseId}
                  </Text>
                </View>
              </>
            )}

            {/* Footer */}
            <View style={styles.divider} />
            <View style={styles.footer}>
              <Text style={styles.thankYou}>Thank you for your purchase!</Text>
              <Text style={styles.supportText}>
                If you have any questions, please contact support.
              </Text>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#ffffff',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 672,
    alignSelf: 'center',
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  receiptCard: {
    borderRadius: 12,
    maxWidth: 672,
    alignSelf: 'center',
    width: '100%',
  },
  receiptContent: {
    padding: 20,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
  },
  brandInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#171717',
  },
  receiptInfo: {
    alignItems: 'flex-end',
  },
  receiptLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
  },
  receiptId: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#525252',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flex: 1,
    minWidth: 100,
  },
  metaLabel: {
    fontSize: 14,
    color: '#737373',
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#171717',
    marginTop: 4,
  },
  metaSubtext: {
    fontSize: 13,
    color: '#a3a3a3',
    marginTop: 2,
  },
  badgeContainer: {
    marginTop: 4,
  },
  customerSection: {
    marginTop: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#171717',
    marginTop: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#737373',
    marginTop: 2,
  },
  itemsSection: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#737373',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  itemQty: {
    fontSize: 14,
    color: '#737373',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  totalsSection: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 160,
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: '#737373',
  },
  totalValue: {
    fontSize: 14,
    color: '#171717',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
  },
  transactionSection: {
    marginTop: 4,
  },
  transactionId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#737373',
    marginTop: 4,
  },
  footer: {
    marginTop: 8,
    alignItems: 'center',
  },
  thankYou: {
    fontSize: 14,
    color: '#171717',
  },
  supportText: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 4,
  },
});
