import * as React from 'react';
import { View, Text, ScrollView, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useCedrosShop } from '../config/context';
import { useCart } from '../state/cart/CartProvider';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import type { Category, Product } from '../types';
import { buildCartItemMetadataFromProduct } from '../utils/cartItemMetadata';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CategoryNav } from '../components/catalog/CategoryNav';
import { FilterPanel, type CatalogFilters } from '../components/catalog/FilterPanel';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { SearchInput } from '../components/catalog/SearchInput';
import { Skeleton } from '../components/ui/skeleton';
import { ErrorState } from '../components/general/ErrorState';
import { CartSidebar } from '../components/cart/CartSidebar';
import { QuickViewDialog } from '../components/catalog/QuickViewDialog';

export interface ShopTemplateProps {
  style?: ViewStyle;
  initialCategorySlug?: string;
  onNavigateToProduct?: (product: Product) => void;
  onNavigateToCheckout?: () => void;
}

function computeFacets(products: Product[]) {
  const tagSet = new Set<string>();
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const p of products) {
    for (const t of p.tags ?? []) tagSet.add(t);
    min = Math.min(min, p.price);
    max = Math.max(max, p.price);
  }
  const tags = Array.from(tagSet).slice(0, 12);
  const price = Number.isFinite(min) ? { min, max } : undefined;
  return { tags, price };
}

export function ShopTemplate({
  style,
  initialCategorySlug,
  onNavigateToProduct,
  onNavigateToCheckout,
}: ShopTemplateProps) {
  const { config } = useCedrosShop();
  const cart = useCart();

  const { categories, isLoading: catsLoading, error: catsError } = useCategories();
  const [search, setSearch] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<string | undefined>(
    initialCategorySlug
  );
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState<string>('featured');
  const [filters, setFilters] = React.useState<CatalogFilters>({});

  const { data, isLoading, error } = useProducts({
    category: activeCategory,
    search: search.trim() || undefined,
    filters,
    sort,
    page,
    pageSize: 24,
  });

  const facets = React.useMemo(() => computeFacets(data?.items ?? []), [data?.items]);

  // Storefront settings for filter/sort visibility
  const { settings: storefrontSettings } = useStorefrontSettings();
  const enabledFilters = storefrontSettings.catalog.filters;
  const enabledSort = storefrontSettings.catalog.sort;

  // Build available sort options based on settings
  const sortOptions = React.useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    if (enabledSort.featured) opts.push({ value: 'featured', label: 'Featured' });
    if (enabledSort.priceAsc) opts.push({ value: 'price_asc', label: 'Price: Low to High' });
    if (enabledSort.priceDesc) opts.push({ value: 'price_desc', label: 'Price: High to Low' });
    if (opts.length === 0) opts.push({ value: 'featured', label: 'Featured' });
    return opts;
  }, [enabledSort]);

  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [quickViewProduct, setQuickViewProduct] = React.useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = React.useState(false);

  const onSelectCategory = (c: Category) => {
    setActiveCategory(c.slug);
    setPage(1);
  };

  const addToCart = React.useCallback(
    (product: Product, variant: { id: string; title: string } | null, qty: number) => {
      cart.addItem(
        {
          productId: product.id,
          variantId: variant?.id,
          unitPrice: product.price,
          currency: product.currency,
          titleSnapshot: variant ? `${product.title} — ${variant.title}` : product.title,
          imageSnapshot: product.images[0]?.url,
          paymentResource: product.id,
          metadata: buildCartItemMetadataFromProduct(product),
        },
        qty
      );
    },
    [cart]
  );

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.brandName}>{config.brand?.name ?? 'Shop'}</Text>
          <View style={styles.searchContainer}>
            <SearchInput value={search} onChange={setSearch} />
          </View>
          <CartSidebar
            open={isCartOpen}
            onOpenChange={setIsCartOpen}
            onCheckout={() => onNavigateToCheckout?.()}
            trigger={
              <Button variant="outline" onPress={() => setIsCartOpen(true)}>
                Cart ({cart.count})
              </Button>
            }
          />
          <Button onPress={() => onNavigateToCheckout?.()}>Checkout</Button>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.layout}>
          {/* Sidebar */}
          <View style={styles.sidebar}>
            <Card style={styles.sidebarCard}>
              <CardHeader>
                <CardTitle style={styles.sidebarTitle}>Browse</CardTitle>
              </CardHeader>
              <CardContent style={styles.sidebarContent}>
                <View style={styles.sidebarSection}>
                  <Text style={styles.sectionTitle}>Categories</Text>
                  {catsError ? <ErrorState description={catsError} /> : null}
                  {catsLoading ? (
                    <View style={styles.skeletonList}>
                      <Skeleton style={styles.skeletonItem} />
                      <Skeleton style={styles.skeletonItem} />
                      <Skeleton style={styles.skeletonItem} />
                    </View>
                  ) : (
                    <CategoryNav
                      categories={categories}
                      activeSlug={activeCategory}
                      onSelect={onSelectCategory}
                    />
                  )}
                </View>

                {sortOptions.length > 1 && (
                  <View style={styles.sidebarSection}>
                    <Text style={styles.sectionTitle}>Sort</Text>
                    <View style={styles.sortOptions}>
                      {sortOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.sortOption,
                            sort === opt.value && styles.sortOptionActive,
                          ]}
                          onPress={() => {
                            setSort(opt.value);
                            setPage(1);
                          }}
                        >
                          <Text
                            style={[
                              styles.sortOptionText,
                              sort === opt.value && styles.sortOptionTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <FilterPanel
                  facets={facets}
                  value={filters}
                  onChange={(next) => {
                    setFilters(next);
                    setPage(1);
                  }}
                  onClear={() => {
                    setFilters({});
                    setPage(1);
                  }}
                  enabledFilters={enabledFilters}
                />
              </CardContent>
            </Card>
          </View>

          {/* Main Content */}
          <View style={styles.main}>
            <View style={styles.mainHeader}>
              <Text style={styles.pageTitle}>
                {storefrontSettings.shopPage.title || 'Shop'}
              </Text>
              {storefrontSettings.shopPage.description && (
                <Text style={styles.pageDescription}>
                  {storefrontSettings.shopPage.description}
                </Text>
              )}
            </View>

            {error ? <ErrorState description={error} /> : null}
            {isLoading ? (
              <View style={styles.productGridSkeleton}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} style={styles.productSkeleton} />
                ))}
              </View>
            ) : (
              <View style={styles.productsSection}>
                <ProductGrid
                  products={data?.items ?? []}
                  columns={config.ui?.productGrid?.columns}
                  onAddToCart={(p) => addToCart(p, null, 1)}
                  onQuickView={(p) => {
                    setQuickViewProduct(p);
                    setIsQuickViewOpen(true);
                  }}
                  onProductPress={onNavigateToProduct}
                  layout={storefrontSettings.shopLayout.layout}
                  imageCrop={storefrontSettings.shopLayout.imageCrop}
                />
                <View style={styles.pagination}>
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Text style={styles.pageNumber}>Page {page}</Text>
                  <Button
                    variant="outline"
                    disabled={!data?.hasNextPage}
                    onPress={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <QuickViewDialog
        product={quickViewProduct}
        open={isQuickViewOpen}
        onOpenChange={setIsQuickViewOpen}
        onAddToCart={(p, v, qty) => addToCart(p, v, qty)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fafafa',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
  },
  searchContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  layout: {
    flexDirection: 'row',
    gap: 20,
  },
  sidebar: {
    width: 280,
    display: 'none', // Hide on mobile, would use media queries in real implementation
  },
  sidebarCard: {
    borderRadius: 12,
  },
  sidebarTitle: {
    fontSize: 16,
  },
  sidebarContent: {
    gap: 20,
  },
  sidebarSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  skeletonList: {
    gap: 8,
    marginTop: 8,
  },
  skeletonItem: {
    height: 36,
    borderRadius: 6,
  },
  sortOptions: {
    gap: 4,
    marginTop: 4,
  },
  sortOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  sortOptionActive: {
    backgroundColor: '#f5f5f5',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#737373',
  },
  sortOptionTextActive: {
    color: '#171717',
    fontWeight: '500',
  },
  main: {
    flex: 1,
  },
  mainHeader: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#171717',
    letterSpacing: -0.5,
  },
  pageDescription: {
    fontSize: 14,
    color: '#737373',
    marginTop: 4,
  },
  productGridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  productSkeleton: {
    width: '47%',
    aspectRatio: 4 / 5,
    borderRadius: 12,
  },
  productsSection: {
    marginTop: 16,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  pageNumber: {
    fontSize: 12,
    color: '#737373',
  },
});
