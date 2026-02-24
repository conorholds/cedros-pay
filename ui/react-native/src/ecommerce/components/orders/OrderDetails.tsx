import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, Linking } from 'react-native';
import type { Order } from '../../types';
import { formatMoney } from '../../utils/money';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';

function statusColor(status: Order['status']): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'processing':
      return 'secondary';
    case 'fulfilled':
      return 'outline';
    case 'cancelled':
      return 'outline';
    case 'refunded':
      return 'outline';
    default:
      return 'secondary';
  }
}

export interface OrderDetailsProps {
  order: Order;
  onBack?: () => void;
  style?: ViewStyle;
}

export function OrderDetails({ order, onBack, style }: OrderDetailsProps) {
  const createdLabel = new Date(order.createdAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const statusLabel = order.status.charAt(0).toUpperCase() + order.status.slice(1);

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      // Silently fail if URL can't be opened
    });
  };

  return (
    <Card style={[styles.card, style]}>
      <CardContent style={styles.content}>
        <View style={styles.header}>
          <View style={styles.orderInfo}>
            <View style={styles.orderTitle}>
              <Text style={styles.label}>Order</Text>
              <Text style={styles.orderId} numberOfLines={1}>
                {order.id}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.date}>{createdLabel}</Text>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.status}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Badge variant={statusColor(order.status)}>
              {statusLabel}
            </Badge>
            {onBack ? (
              <Button variant="outline" size="sm" onPress={onBack}>
                Back
              </Button>
            ) : null}
          </View>
        </View>

        <Separator style={styles.separator} />

        <View style={styles.itemsList}>
          {order.items.map((it, idx) => (
            <View key={`${it.title}-${idx}`} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {it.title}
                </Text>
                <Text style={styles.itemQty}>Qty {it.qty}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {formatMoney({ amount: it.unitPrice * it.qty, currency: it.currency })}
              </Text>
            </View>
          ))}
        </View>

        <Separator style={styles.separator} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>
            {formatMoney({ amount: order.total, currency: order.currency })}
          </Text>
        </View>

        {(order.receiptUrl || order.invoiceUrl) ? (
          <View style={styles.linksRow}>
            {order.receiptUrl ? (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleOpenLink(order.receiptUrl!)}
              >
                Receipt
              </Button>
            ) : null}
            {order.invoiceUrl ? (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => handleOpenLink(order.invoiceUrl!)}
              >
                Invoice
              </Button>
            ) : null}
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
    color: '#525252',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    color: '#737373',
  },
  bullet: {
    fontSize: 12,
    color: '#d4d4d4',
  },
  status: {
    fontSize: 12,
    color: '#737373',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  separator: {
    marginVertical: 16,
  },
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    color: '#171717',
  },
  itemQty: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#737373',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
});
