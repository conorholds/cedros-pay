import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { useOrders } from '../hooks/useOrders';
import { EmptyState } from '../components/general/EmptyState';
import { ErrorState } from '../components/general/ErrorState';
import { Skeleton } from '../components/ui/skeleton';
import { OrderDetails } from '../components/orders/OrderDetails';
import { OrderList } from '../components/orders/OrderList';
import type { Order } from '../types';

export interface PurchaseHistoryTemplateProps {
  style?: ViewStyle;
  isSignedIn?: boolean;
  onLogin?: () => void;
}

export function PurchaseHistoryTemplate({
  style,
  isSignedIn = true,
  onLogin,
}: PurchaseHistoryTemplateProps) {
  const { orders, isLoading, error } = useOrders();
  const [selected, setSelected] = React.useState<Order | null>(null);

  if (!isSignedIn) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <View style={styles.maxWidth}>
          <EmptyState
            title="Sign in to view your orders"
            description="Your purchase history will appear here once you're logged in."
            actionLabel={onLogin ? 'Sign in' : undefined}
            onAction={onLogin}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Orders</Text>
            <Text style={styles.subtitle}>
              View past purchases and receipts.
            </Text>
          </View>

          {!isLoading && !error && !selected && orders.length > 0 ? (
            <Text style={styles.orderCount}>
              {orders.length} order{orders.length === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>

        {error ? (
          <View style={styles.stateContainer}>
            <ErrorState description={error} />
          </View>
        ) : null}
        
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <Skeleton style={styles.skeleton} />
            <Skeleton style={styles.skeleton} />
            <Skeleton style={styles.skeleton} />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.stateContainer}>
            <EmptyState title="No orders yet" description="When you purchase something, it will show up here." />
          </View>
        ) : selected ? (
          <View style={styles.stateContainer}>
            <OrderDetails order={selected} onBack={() => setSelected(null)} />
          </View>
        ) : (
          <View style={styles.stateContainer}>
            <OrderList orders={orders} onView={setSelected} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  maxWidth: {
    width: '100%',
    maxWidth: 448,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#171717',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
  },
  orderCount: {
    fontSize: 14,
    color: '#737373',
  },
  stateContainer: {
    marginTop: 8,
  },
  skeletonContainer: {
    gap: 12,
    marginTop: 8,
  },
  skeleton: {
    height: 128,
    borderRadius: 12,
  },
});
