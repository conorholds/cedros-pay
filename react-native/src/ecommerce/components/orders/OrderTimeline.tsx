import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import type { Order } from '../../types';

interface TimelineEvent {
  date: string;
  status: Order['status'];
  description?: string;
}

function getStatusLabel(status: Order['status']): string {
  switch (status) {
    case 'created':
      return 'Order Created';
    case 'paid':
      return 'Payment Received';
    case 'processing':
      return 'Processing Order';
    case 'fulfilled':
      return 'Order Fulfilled';
    case 'shipped':
      return 'Order Shipped';
    case 'delivered':
      return 'Order Delivered';
    case 'cancelled':
      return 'Order Cancelled';
    case 'refunded':
      return 'Order Refunded';
    default:
      return status;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export interface OrderTimelineProps {
  order: Order;
  style?: ViewStyle;
}

export function OrderTimeline({ order, style }: OrderTimelineProps) {
  // Build timeline events from order status
  const events: TimelineEvent[] = [
    { date: order.createdAt, status: 'created' },
    ...(order.status !== 'created' ? [{ date: order.createdAt, status: order.status }] : []),
  ];

  return (
    <View style={[styles.container, style]}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const isActive = isLast;

        return (
          <View key={`${event.status}-${index}`} style={styles.eventContainer}>
            <View style={styles.leftColumn}>
              <View style={[styles.dot, isActive && styles.activeDot]} />
              {!isLast && <View style={styles.line} />}
            </View>
            <View style={styles.content}>
              <Text style={[styles.statusLabel, isActive && styles.activeLabel]}>
                {getStatusLabel(event.status)}
              </Text>
              <Text style={styles.dateLabel}>{formatDate(event.date)}</Text>
              {event.description && (
                <Text style={styles.description}>{event.description}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  eventContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  leftColumn: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e5e5e5',
    borderWidth: 2,
    borderColor: '#d4d4d4',
  },
  activeDot: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e5e5',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
  },
  activeLabel: {
    color: '#171717',
    fontWeight: '600',
  },
  dateLabel: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 2,
  },
  description: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
  },
});
