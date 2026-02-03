import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, ScrollView, Linking } from 'react-native';
import type { Order } from '../../types';
import { formatMoney } from '../../utils/money';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

export interface ReceiptViewProps {
  order: Order;
  storeName?: string;
  onDownload?: () => void;
  style?: ViewStyle;
}

export function ReceiptView({ order, storeName = 'Store', onDownload, style }: ReceiptViewProps) {
  const formattedDate = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(order.createdAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      // Silently fail
    });
  };

  return (
    <Card style={[styles.card, style]}>
      <CardContent style={styles.content}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.storeName}>{storeName}</Text>
            <Text style={styles.receiptTitle}>Receipt</Text>
          </View>

          <Text style={styles.orderId}>Order #{order.id}</Text>

          <Separator style={styles.separator} />

          {/* Date & Status */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{formattedDate}</Text>
              <Text style={styles.metaSubtext}>{formattedTime}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>

          <Separator style={styles.separator} />

          {/* Items */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items</Text>
            {order.items.map((item, idx) => (
              <View key={`${item.title}-${idx}`} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemQty}>Qty: {item.qty}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  {formatMoney({ amount: item.unitPrice * item.qty, currency: item.currency })}
                </Text>
              </View>
            ))}
          </View>

          <Separator style={styles.separator} />

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {formatMoney({ amount: order.total, currency: order.currency })}
            </Text>
          </View>

          {/* Payment Info */}
          {order.source && (
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentLabel}>
                Paid via {order.source === 'stripe' ? 'Card' : order.source === 'x402' ? 'Crypto' : 'Credits'}
              </Text>
              {order.purchaseId && (
                <Text style={styles.purchaseId} numberOfLines={1}>
                  Transaction ID: {order.purchaseId}
                </Text>
              )}
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.thankYou}>Thank you for your purchase!</Text>
            <Text style={styles.supportText}>If you have any questions, please contact support.</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {order.receiptUrl && (
              <Button variant="outline" onPress={() => handleOpenUrl(order.receiptUrl!)}>
                View Online
              </Button>
            )}
            {onDownload && (
              <Button onPress={onDownload}>
                Download PDF
              </Button>
            )}
          </View>
        </ScrollView>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  content: {
    padding: 0,
  },
  scrollView: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#171717',
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#737373',
  },
  orderId: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#525252',
    marginBottom: 16,
  },
  separator: {
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  metaSubtext: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 2,
  },
  itemsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    color: '#171717',
    lineHeight: 20,
  },
  itemQty: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#171717',
  },
  paymentInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  paymentLabel: {
    fontSize: 12,
    color: '#737373',
  },
  purchaseId: {
    fontSize: 11,
    color: '#a3a3a3',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  thankYou: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  supportText: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
});
