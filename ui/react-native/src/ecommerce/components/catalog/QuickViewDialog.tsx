import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import type { Product, ProductVariant } from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ProductGallery } from './ProductGallery';
import { Price } from './Price';
import { VariantSelector } from './VariantSelector';
import { QuantitySelector } from './QuantitySelector';
import { Button } from '../ui/button';

export interface QuickViewDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewDetails?: (slug: string) => void;
  onAddToCart: (product: Product, variant: ProductVariant | null, qty: number) => void;
  style?: ViewStyle;
}

export function QuickViewDialog({
  product,
  open,
  onOpenChange,
  onViewDetails,
  onAddToCart,
  style,
}: QuickViewDialogProps) {
  const [qty, setQty] = React.useState(1);
  const [selected, setSelected] = React.useState<{ selectedOptions: Record<string, string>; variant: ProductVariant | null }>({
    selectedOptions: {},
    variant: null,
  });

  React.useEffect(() => {
    if (!product) return;
    setQty(1);
    if (product.variants?.length) {
      const first = product.variants[0];
      setSelected({ selectedOptions: { ...first.options }, variant: first });
    } else {
      setSelected({ selectedOptions: {}, variant: null });
    }
    // Only reset when product identity changes, not on every property update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!product) return null;

  const unitPrice = selected.variant?.price ?? product.price;
  const compareAt = selected.variant?.compareAtPrice ?? product.compareAtPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={[styles.content, style]}>
        <DialogHeader>
          <DialogTitle style={styles.titleRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {product.title}
            </Text>
            {onViewDetails ? (
              <TouchableOpacity onPress={() => onViewDetails(product.slug)}>
                <Text style={styles.viewDetails}>View details</Text>
              </TouchableOpacity>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.contentContainer}>
            <ProductGallery images={product.images} />
            <View style={styles.detailsSection}>
              <View>
                <Price amount={unitPrice} currency={product.currency} compareAt={compareAt} />
                <Text style={styles.description}>{product.description}</Text>
              </View>

              <VariantSelector
                product={product}
                value={{ selectedOptions: selected.selectedOptions, variantId: selected.variant?.id }}
                onChange={(next) => setSelected(next)}
              />

              <View style={styles.quantityRow}>
                <QuantitySelector qty={qty} onChange={setQty} />
                <Button
                  style={styles.addToCartButton}
                  onPress={() => {
                    onAddToCart(product, selected.variant, qty);
                    onOpenChange(false);
                  }}
                >
                  Add to cart
                </Button>
              </View>

              <Text style={styles.inventoryText}>
                {product.inventoryStatus === 'out_of_stock' ? 'Out of stock' : 'In stock'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  content: {
    maxWidth: 672, // max-w-3xl equivalent
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  titleText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
  },
  viewDetails: {
    fontSize: 14,
    color: '#525252',
    textDecorationLine: 'underline',
  },
  contentContainer: {
    gap: 32,
  },
  detailsSection: {
    gap: 20,
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    color: '#737373',
    lineHeight: 20,
  },
  quantityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  addToCartButton: {
    flex: 1,
  },
  inventoryText: {
    fontSize: 12,
    color: '#737373',
  },
});
