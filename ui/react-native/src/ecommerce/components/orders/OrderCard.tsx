import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, Linking } from 'react-native';
import type { Order } from '../../types';
import { formatMoney } from '../../utils/money';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

function statusColor(status: Order['status']): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'created':
      return 'secondary';
    case 'paid':
      return 'default';
    case 'processing':
      return 'secondary';
    case 'fulfilled':
      return 'outline';
    case 'shipped':
      return 'default';
    case 'delivered':
      return 'outline';
    case 'cancelled':
      return 'outline';
    case 'refunded':
      return 'outline';
    default:
      return 'secondary';
  }
}

export interface OrderCardProps {
  order: Order;
  onView?: (order: Order) => void;
  style?: ViewStyle;
}

export function OrderCard({ order, onView, style }: OrderCardProps) {
  const itemsLabel = `${order.items.length} item${order.items.length === 1 ? '' : 's'}`;
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
            <Text style={styles.date}>{createdLabel}</Text>
          </View>
          <Badge variant={statusColor(order.status)}>
            {statusLabel}
          </Badge>
        </View>

        <View style={styles.row}>
          <Text style={styles.itemsLabel}>{itemsLabel}</Text>
          <Text style={styles.total}>
            {formatMoney({ amount: order.total, currency: order.currency })}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.footer}>
          <View style={styles.linkButtons}>
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
          {onView ? (
            <Button
              variant="outline"
              size="sm"
              onPress={() => onView(order)}
            >
              Details
            </Button>
          ) : null}
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
    marginRight: 8,
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
  date: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemsLabel: {
    fontSize: 14,
    color: '#737373',
  },
  total: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
