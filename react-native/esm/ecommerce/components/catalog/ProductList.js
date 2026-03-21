import * as React from 'react';
import { View, FlatList, StyleSheet, } from 'react-native';
import { ProductCard } from './ProductCard';
export function ProductList({ products, onAddToCart, onQuickView, onProductPress, style, layout, imageCrop, }) {
    const renderItem = ({ item }) => (<View style={styles.item}>
      <ProductCard product={item} onPress={() => onProductPress?.(item)} onAddToCart={onAddToCart} onQuickView={onQuickView} layout={layout} imageCrop={imageCrop} style={styles.card}/>
    </View>);
    return (<FlatList data={products} renderItem={renderItem} keyExtractor={(item) => item.id} contentContainerStyle={[styles.container, style]} showsVerticalScrollIndicator={false}/>);
}
const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    item: {
        width: '100%',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
//# sourceMappingURL=ProductList.js.map