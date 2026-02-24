import * as React from 'react';
import { View, Text, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useCart } from '../state/cart/CartProvider';
import { useProduct } from '../hooks/useProduct';
import { useProducts } from '../hooks/useProducts';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { useAIRelatedProducts } from '../hooks/useAIRelatedProducts';
import type { Product, ProductVariant } from '../types';
import { buildCartItemMetadataFromProduct } from '../utils/cartItemMetadata';
import { ProductGallery } from '../components/catalog/ProductGallery';
import { VariantSelector } from '../components/catalog/VariantSelector';
import { QuantitySelector } from '../components/catalog/QuantitySelector';
import { Price } from '../components/catalog/Price';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ErrorState } from '../components/general/ErrorState';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { parseCsv } from '../../utils/csvHelpers';

export interface ProductTemplateProps {
  slug: string;
  style?: ViewStyle;
  onNavigateToCheckout?: () => void;
  onNavigateToCart?: () => void;
  onNavigateToProduct?: (product: Product) => void;
}

export function ProductTemplate({
  slug,
  style,
  onNavigateToCheckout,
  onNavigateToProduct,
}: ProductTemplateProps) {
  const cart = useCart();
  const { product, isLoading, error } = useProduct(slug);
  const [qty, setQty] = React.useState(1);
  const [selected, setSelected] = React.useState<{ selectedOptions: Record<string, string>; variant: ProductVariant | null }>({
    selectedOptions: {},
    variant: null,
  });

  React.useEffect(() => {
    if (!product || !product.variants?.length) return;
    const first = product.variants[0];
    setSelected({ selectedOptions: { ...first.options }, variant: first });
  }, [product?.id]);

  // Storefront settings for related products
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { mode, maxItems } = storefrontSettings.relatedProducts;

  // AI recommendations (only fetched when mode is 'ai')
  const aiRecommendations = useAIRelatedProducts({
    productId: product?.id,
    enabled: mode === 'ai' && !!product?.id,
  });

  // Determine related products query based on mode
  const relatedQuery = React.useMemo(() => {
    if (mode === 'by_category' && product?.categoryIds?.length) {
      return { category: product.categoryIds[0], page: 1, pageSize: maxItems + 1 };
    }
    return { page: 1, pageSize: maxItems + 4 };
  }, [mode, maxItems, product?.categoryIds]);

  const related = useProducts(relatedQuery);

  // Filter and select related products based on mode
  const relatedItems = React.useMemo((): Product[] => {
    const allProducts = related.data?.items ?? [];
    const filtered = allProducts.filter((p) => p.slug !== slug);

    if (mode === 'manual' && product) {
      const relatedIdsRaw = product.attributes?.relatedProductIds || product.attributes?.related_product_ids;
      if (relatedIdsRaw) {
        const relatedIds = parseCsv(String(relatedIdsRaw));
        if (relatedIds.length > 0) {
          const byId = new Map(filtered.map((p) => [p.id, p]));
          const manual = relatedIds.map((id) => byId.get(id)).filter((p): p is Product => !!p);
          return manual.slice(0, maxItems);
        }
      }
    }

    if (mode === 'ai') {
      if (aiRecommendations.relatedProductIds && aiRecommendations.relatedProductIds.length > 0) {
        const byId = new Map(filtered.map((p) => [p.id, p]));
        const aiProducts = aiRecommendations.relatedProductIds
          .map((id) => byId.get(id))
          .filter((p): p is Product => !!p);
        if (aiProducts.length > 0) {
          return aiProducts.slice(0, maxItems);
        }
      }
    }

    return filtered.slice(0, maxItems);
  }, [related.data?.items, slug, mode, maxItems, product, aiRecommendations.relatedProductIds]);

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <Skeleton style={styles.breadcrumbSkeleton} />
          <View style={styles.productLayout}>
            <Skeleton style={styles.imageSkeleton} />
            <View style={styles.detailsSkeleton}>
              <Skeleton style={styles.titleSkeleton} />
              <Skeleton style={styles.priceSkeleton} />
              <Skeleton style={styles.descSkeleton} />
              <Skeleton style={styles.buttonSkeleton} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <ErrorState description={error} />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <ErrorState description="Product not found." />
        </View>
      </View>
    );
  }

  const unitPrice = selected.variant?.price ?? product.price;
  const compareAt = selected.variant?.compareAtPrice ?? product.compareAtPrice;
  const isOutOfStock =
    product.inventoryStatus === 'out_of_stock' ||
    (typeof product.inventoryQuantity === 'number' && product.inventoryQuantity <= 0);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    cart.addItem(
      {
        productId: product.id,
        variantId: selected.variant?.id,
        unitPrice,
        currency: product.currency,
        titleSnapshot: selected.variant ? `${product.title} — ${selected.variant.title}` : product.title,
        imageSnapshot: product.images[0]?.url,
        paymentResource: product.id,
        metadata: buildCartItemMetadataFromProduct(product),
      },
      qty
    );
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    handleAddToCart();
    onNavigateToCheckout?.();
  };

  return (
    <ScrollView style={[styles.container, style]} contentContainerStyle={styles.content}>
      {/* Breadcrumb */}
      <Text style={styles.breadcrumb}>← Back to Shop</Text>

      <View style={styles.productLayout}>
        {/* Product Images */}
        <ProductGallery images={product.images} />

        {/* Product Details */}
        <View style={styles.detailsSection}>
          <Text style={styles.productTitle}>{product.title}</Text>
          <View style={styles.priceContainer}>
            <Price amount={unitPrice} currency={product.currency} compareAt={compareAt} />
          </View>
          {isOutOfStock ? (
            <Text style={styles.outOfStock}>Out of stock</Text>
          ) : typeof product.inventoryQuantity === 'number' && product.inventoryQuantity > 0 && product.inventoryQuantity <= 5 ? (
            <Text style={styles.lowStock}>
              Only <Text style={styles.lowStockBold}>{product.inventoryQuantity}</Text> left
            </Text>
          ) : null}
          <Text style={styles.description}>{product.description}</Text>

          <VariantSelector
            product={product}
            value={{ selectedOptions: selected.selectedOptions, variantId: selected.variant?.id }}
            onChange={(next) => setSelected(next)}
          />

          <View style={styles.actionRow}>
            <QuantitySelector qty={qty} onChange={setQty} />
            <Button
              onPress={handleAddToCart}
              style={styles.addToCartButton}
              disabled={isOutOfStock}
            >
              {isOutOfStock ? 'Out of stock' : 'Add to cart'}
            </Button>
            <Button variant="outline" onPress={handleBuyNow} disabled={isOutOfStock}>
              Buy now
            </Button>
          </View>
        </View>
      </View>

      {/* Related Products */}
      {storefrontSettings.sections.showRelatedProducts && relatedItems.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>Related products</Text>
          <ProductGrid
            products={relatedItems}
            columns={{ base: 2, md: 4, lg: 4 }}
            layout={storefrontSettings.relatedProducts.layout.layout}
            imageCrop={storefrontSettings.relatedProducts.layout.imageCrop}
            onAddToCart={(p) =>
              cart.addItem(
                {
                  productId: p.id,
                  unitPrice: p.price,
                  currency: p.currency,
                  titleSnapshot: p.title,
                  imageSnapshot: p.images[0]?.url,
                  paymentResource: p.id,
                },
                1
              )
            }
            onProductPress={onNavigateToProduct}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    padding: 16,
  },
  breadcrumbSkeleton: {
    height: 20,
    width: 120,
    marginBottom: 16,
  },
  productLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  imageSkeleton: {
    flex: 1,
    minWidth: 300,
    aspectRatio: 1,
    borderRadius: 12,
  },
  detailsSkeleton: {
    flex: 1,
    minWidth: 300,
    gap: 12,
  },
  titleSkeleton: {
    height: 32,
    width: '70%',
  },
  priceSkeleton: {
    height: 24,
    width: 100,
  },
  descSkeleton: {
    height: 80,
  },
  buttonSkeleton: {
    height: 44,
  },
  errorContainer: {
    padding: 16,
  },
  breadcrumb: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 16,
  },
  detailsSection: {
    flex: 1,
    minWidth: 300,
    gap: 12,
  },
  productTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#171717',
    letterSpacing: -0.5,
  },
  priceContainer: {
    marginTop: 8,
  },
  outOfStock: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
    marginTop: 8,
  },
  lowStock: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
  },
  lowStockBold: {
    fontWeight: '600',
    color: '#171717',
  },
  description: {
    fontSize: 14,
    color: '#737373',
    lineHeight: 20,
    marginTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 20,
  },
  addToCartButton: {
    flex: 1,
    minWidth: 140,
  },
  relatedSection: {
    marginTop: 40,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 16,
  },
});
