import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import type { Order } from '../../types';
import { Badge } from '../ui/badge';

type StatusVariant = 'default' | 'secondary' | 'outline';

function getStatusConfig(status: Order['status']): { variant: StatusVariant; label: string; color: string } {
  switch (status) {
    case 'created':
      return { variant: 'secondary', label: 'Created', color: '#737373' };
    case 'paid':
      return { variant: 'default', label: 'Paid', color: '#171717' };
    case 'processing':
      return { variant: 'secondary', label: 'Processing', color: '#737373' };
    case 'fulfilled':
      return { variant: 'outline', label: 'Fulfilled', color: '#525252' };
    case 'shipped':
      return { variant: 'default', label: 'Shipped', color: '#171717' };
    case 'delivered':
      return { variant: 'outline', label: 'Delivered', color: '#525252' };
    case 'cancelled':
      return { variant: 'outline', label: 'Cancelled', color: '#dc2626' };
    case 'refunded':
      return { variant: 'outline', label: 'Refunded', color: '#525252' };
    default:
      return { variant: 'secondary', label: status, color: '#737373' };
  }
}

export interface OrderStatusProps {
  status: Order['status'];
  showBadge?: boolean;
  showLabel?: boolean;
  style?: ViewStyle;
}

export function OrderStatus({ status, showBadge = true, showLabel = false, style }: OrderStatusProps) {
  const config = getStatusConfig(status);
  const capitalizedLabel = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={[styles.container, style]}>
      {showBadge && (
        <Badge variant={config.variant}>
          {capitalizedLabel}
        </Badge>
      )}
      {showLabel && !showBadge && (
        <Text style={[styles.label, { color: config.color }]}>
          {capitalizedLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
