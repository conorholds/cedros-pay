import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { OrderCard } from './OrderCard';
export function OrderList({ orders, onView, style }) {
    return (<View style={[styles.container, style]}>
      {orders.map((o) => (<OrderCard key={o.id} order={o} onView={onView} style={styles.card}/>))}
    </View>);
}
const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    card: {
        width: '100%',
    },
});
//# sourceMappingURL=OrderList.js.map