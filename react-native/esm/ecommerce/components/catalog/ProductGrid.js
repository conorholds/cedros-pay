import * as React from 'react';
import { View, FlatList, StyleSheet, Dimensions, } from 'react-native';
import { ProductCard } from './ProductCard';
const { width: screenWidth } = Dimensions.get('window');
const GAP = 16;
export function ProductGrid({ products, columns, onAddToCart, onQuickView, onProductPress, style, layout, imageCrop, }) {
    const numColumns = columns?.base ?? 2;
    const getItemWidth = () => {
        const totalGap = (numColumns - 1) * GAP;
        return (screenWidth - 32 - totalGap) / numColumns; // 32 for container padding
    };
    const renderItem = ({ item }) => (<View style={[styles.item, { width: getItemWidth() }]}>
      <ProductCard product={item} onPress={() => onProductPress?.(item)} onAddToCart={onAddToCart} onQuickView={onQuickView} layout={layout} imageCrop={imageCrop}/>
    </View>);
    return (<FlatList data={products} renderItem={renderItem} keyExtractor={(item) => item.id} numColumns={numColumns} contentContainerStyle={[styles.container, style]} columnWrapperStyle={numColumns > 1 ? styles.row : undefined} showsVerticalScrollIndicator={false}/>);
}
const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: GAP,
    },
    row: {
        gap: GAP,
        justifyContent: 'flex-start',
    },
    item: {
        flex: 0,
    },
});
//# sourceMappingURL=ProductGrid.js.map