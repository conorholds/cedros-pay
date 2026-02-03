import * as React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import type { Order } from '../../types';
import { OrderCard } from './OrderCard';

export interface OrderListProps {
  orders: Order[];
  onView?: (order: Order) => void;
  style?: ViewStyle;
}

export function OrderList({ orders, onView, style }: OrderListProps) {
  return (
    <View style={[styles.container, style]}>
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} onView={onView} style={styles.card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    width: '100%',
  },
});
