import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import type { Order } from '../../types';
import { formatMoney } from '../../utils/money';
import { Card, CardContent } from '../ui/card';
import { OrderStatus } from './OrderStatus';

export interface PurchaseHistoryProps {
  orders: Order[];
  onSelectOrder?: (order: Order) => void;
  style?: ViewStyle;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PurchaseHistory({ orders, onSelectOrder, style }: PurchaseHistoryProps) {
  // Group orders by month/year
  const groupedOrders = React.useMemo(() => {
    const groups: Record<string, Order[]> = {};
    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      const key = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(order);
    });
    return groups;
  }, [orders]);

  const sortedGroups = React.useMemo(() => {
    return Object.entries(groupedOrders).sort((a, b) => {
      // Sort by date descending
      const dateA = new Date(a[1][0].createdAt);
      const dateB = new Date(b[1][0].createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [groupedOrders]);

  return (
    <View style={[styles.container, style]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {sortedGroups.map(([monthKey, monthOrders]) => (
          <View key={monthKey} style={styles.monthGroup}>
            <Text style={styles.monthHeader}>{monthKey}</Text>
            <View style={styles.ordersList}>
              {monthOrders.map((order) => (
                <Card
                  key={order.id}
                  style={styles.orderCard}
                >
                  <CardContent style={styles.orderContent}>
                    <View style={styles.orderHeader}>
                      <View style={styles.orderInfo}>
                        <Text style={styles.orderId}>#{order.id.slice(-8)}</Text>
                        <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                      </View>
                      <OrderStatus status={order.status} />
                    </View>

                    <View style={styles.itemsPreview}>
                      <Text style={styles.itemsText} numberOfLines={1}>
                        {order.items.map((item) => item.title).join(', ')}
                      </Text>
                    </View>

                    <View style={styles.orderFooter}>
                      <Text style={styles.itemsCount}>
                        {order.items.length} item{order.items.length === 1 ? '' : 's'}
                      </Text>
                      <Text style={styles.orderTotal}>
                        {formatMoney({ amount: order.total, currency: order.currency })}
                      </Text>
                    </View>

                    {onSelectOrder && (
                      <View style={styles.actionRow}>
                        <Text
                          style={styles.viewDetails}
                          onPress={() => onSelectOrder(order)}
                        >
                          View Details →
                        </Text>
                      </View>
                    )}
                  </CardContent>
                </Card>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthGroup: {
    marginBottom: 24,
  },
  monthHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  ordersList: {
    gap: 10,
  },
  orderCard: {
    width: '100%',
  },
  orderContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
    marginRight: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
    color: '#171717',
  },
  orderDate: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  itemsPreview: {
    marginBottom: 8,
  },
  itemsText: {
    fontSize: 13,
    color: '#525252',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsCount: {
    fontSize: 12,
    color: '#737373',
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  actionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  viewDetails: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
});
