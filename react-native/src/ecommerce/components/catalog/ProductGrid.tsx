import * as React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ViewStyle,
  Dimensions,
} from 'react-native';
import type { Product } from '../../types';
import type { ProductCardLayout, ImageCropPosition } from '../../hooks/useStorefrontSettings';
import { ProductCard } from './ProductCard';

export interface ProductGridProps {
  products: Product[];
  columns?: { base?: number; md?: number; lg?: number };
  onAddToCart?: (product: Product, variant: any) => void;
  onQuickView?: (product: Product) => void;
  onProductPress?: (product: Product) => void;
  style?: ViewStyle;
  /** Card layout style */
  layout?: ProductCardLayout;
  /** Image crop/focus position */
  imageCrop?: ImageCropPosition;
}

const { width: screenWidth } = Dimensions.get('window');
const GAP = 16;

export function ProductGrid({
  products,
  columns,
  onAddToCart,
  onQuickView,
  onProductPress,
  style,
  layout,
  imageCrop,
}: ProductGridProps) {
  const numColumns = columns?.base ?? 2;

  const getItemWidth = () => {
    const totalGap = (numColumns - 1) * GAP;
    return (screenWidth - 32 - totalGap) / numColumns; // 32 for container padding
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={[styles.item, { width: getItemWidth() }]}>
      <ProductCard
        product={item}
        onPress={() => onProductPress?.(item)}
        onAddToCart={onAddToCart}
        onQuickView={onQuickView}
        layout={layout}
        imageCrop={imageCrop}
      />
    </View>
  );

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={(item: Product) => item.id}
      numColumns={numColumns}
      contentContainerStyle={[styles.container, style]}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      showsVerticalScrollIndicator={false}
    />
  );
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
