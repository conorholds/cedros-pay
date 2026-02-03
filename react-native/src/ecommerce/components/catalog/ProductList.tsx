import * as React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import type { Product } from '../../types';
import type { ProductCardLayout, ImageCropPosition } from '../../hooks/useStorefrontSettings';
import { ProductCard } from './ProductCard';

export interface ProductListProps {
  products: Product[];
  onAddToCart?: (product: Product, variant: any) => void;
  onQuickView?: (product: Product) => void;
  onProductPress?: (product: Product) => void;
  style?: ViewStyle;
  /** Card layout style */
  layout?: ProductCardLayout;
  /** Image crop/focus position */
  imageCrop?: ImageCropPosition;
}

export function ProductList({
  products,
  onAddToCart,
  onQuickView,
  onProductPress,
  style,
  layout,
  imageCrop,
}: ProductListProps) {
  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.item}>
      <ProductCard
        product={item}
        onPress={() => onProductPress?.(item)}
        onAddToCart={onAddToCart}
        onQuickView={onQuickView}
        layout={layout}
        imageCrop={imageCrop}
        style={styles.card}
      />
    </View>
  );

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={(item: Product) => item.id}
      contentContainerStyle={[styles.container, style]}
      showsVerticalScrollIndicator={false}
    />
  );
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
