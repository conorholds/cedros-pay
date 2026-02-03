import * as React from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import type { Product, ProductVariant } from '../../types';
import type { ProductCardLayout, ImageCropPosition } from '../../hooks/useStorefrontSettings';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Price } from './Price';

const ASPECT_RATIOS: Record<ProductCardLayout, number> = {
  large: 4 / 5,
  square: 1,
  compact: 3 / 4,
};

export interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onAddToCart?: (product: Product, variant: ProductVariant | null) => void;
  onQuickView?: (product: Product) => void;
  style?: ViewStyle;
  /** Card layout style */
  layout?: ProductCardLayout;
  /** Image crop/focus position - mapped to resizeMode */
  imageCrop?: ImageCropPosition;
}

export function ProductCard({
  product,
  onPress,
  onAddToCart,
  onQuickView,
  style,
  layout = 'large',
  imageCrop = 'center',
}: ProductCardProps) {
  const isOutOfStock =
    product.inventoryStatus === 'out_of_stock' ||
    (typeof product.inventoryQuantity === 'number' && product.inventoryQuantity <= 0);
  const lowStockQty = typeof product.inventoryQuantity === 'number' ? product.inventoryQuantity : null;

  const resizeMode = imageCrop === 'center' ? 'cover' : imageCrop as 'center' | 'top' | 'bottom' | 'left' | 'right';

  const padding = layout === 'compact' ? 12 : 16;
  const titleSize = layout === 'compact' ? styles.titleCompact : styles.titleDefault;

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.imageSection}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.9}
          accessibilityLabel={`View ${product.title}`}
        >
          <View style={[styles.imageContainer, { aspectRatio: ASPECT_RATIOS[layout] }]}>
            <Image
              source={{ uri: product.images[0]?.url }}
              style={[styles.image, { resizeMode }]}
              accessibilityLabel={product.images[0]?.alt ?? product.title}
            />
          </View>
        </TouchableOpacity>

        {layout !== 'compact' && product.tags?.length ? (
          <View style={styles.tagsContainer}>
            {product.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" style={styles.tagBadge} textStyle={styles.tagText}>
                {t}
              </Badge>
            ))}
          </View>
        ) : null}

        {isOutOfStock ? (
          <View style={styles.stockBadge}>
            <Badge variant="secondary" style={styles.tagBadge} textStyle={styles.tagText}>
              Out of stock
            </Badge>
          </View>
        ) : lowStockQty != null && lowStockQty > 0 && lowStockQty <= 5 ? (
          <View style={styles.stockBadge}>
            <Badge variant="secondary" style={styles.tagBadge} textStyle={styles.tagText}>
              Only {lowStockQty} left
            </Badge>
          </View>
        ) : null}

        {onQuickView ? (
          <View style={styles.quickViewContainer}>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => onQuickView(product)}
            >
              Quick view
            </Button>
          </View>
        ) : null}
      </View>

      <View style={[styles.content, { padding }]}>
        <View style={styles.contentTop}>
          <View style={styles.textContainer}>
            <Text style={[styles.title, titleSize]} numberOfLines={1}>
              {product.title}
            </Text>
            <View style={styles.priceContainer}>
              <Price
                amount={product.price}
                currency={product.currency}
                compareAt={product.compareAtPrice}
                size={layout === 'compact' ? 'sm' : 'default'}
              />
            </View>
          </View>
        </View>

        {layout === 'large' && (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        <View style={layout === 'compact' ? styles.buttonContainerCompact : styles.buttonContainer}>
          <Button
            size={layout === 'compact' ? 'sm' : 'default'}
            onPress={() => onAddToCart?.(product, null)}
            disabled={isOutOfStock}
            style={styles.addToCartButton}
          >
            {isOutOfStock ? 'Out of stock' : 'Add to cart'}
          </Button>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
  },
  imageSection: {
    position: 'relative',
  },
  imageContainer: {
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tagsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 4,
    padding: 12,
    pointerEvents: 'none',
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  tagText: {
    color: '#171717',
  },
  stockBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    pointerEvents: 'none',
  },
  quickViewContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
    opacity: 0,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  contentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: '500',
    color: '#171717',
  },
  titleDefault: {
    fontSize: 14,
  },
  titleCompact: {
    fontSize: 12,
  },
  priceContainer: {
    marginTop: 4,
  },
  description: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: '#737373',
    minHeight: 32,
  },
  buttonContainer: {
    marginTop: 'auto',
    paddingTop: 16,
  },
  buttonContainerCompact: {
    marginTop: 'auto',
    paddingTop: 12,
  },
  addToCartButton: {
    width: '100%',
  },
});
