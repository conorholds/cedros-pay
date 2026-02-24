import * as React from 'react';
import { View, Text, ScrollView, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useCedrosShop } from '../config/context';
import { useCart } from '../state/cart/CartProvider';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import type { Product } from '../types';
import { buildCartItemMetadataFromProduct } from '../utils/cartItemMetadata';
import { CartSidebar } from '../components/cart/CartSidebar';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { SearchInput } from '../components/catalog/SearchInput';
import { Skeleton } from '../components/ui/skeleton';
import { ErrorState } from '../components/general/ErrorState';
import { FilterPanel, type CatalogFilters } from '../components/catalog/FilterPanel';
import { QuickViewDialog } from '../components/catalog/QuickViewDialog';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export interface CategoryTemplateProps {
  categorySlug: string;
  style?: ViewStyle;
  onNavigateToShop?: () => void;
  onNavigateToProduct?: (product: Product) => void;
  onNavigateToCheckout?: () => void;
}

export function CategoryTemplate({
  categorySlug,
  style,
  onNavigateToShop,
  onNavigateToProduct,
  onNavigateToCheckout,
}: CategoryTemplateProps) {
  const { config } = useCedrosShop();
  const cart = useCart();
  const { categories } = useCategories();

  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState<string>('featured');
  const [filters, setFilters] = React.useState<CatalogFilters>({});
  const [quickViewProduct, setQuickViewProduct] = React.useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = React.useState(false);

  const category = categories.find((c) => c.slug === categorySlug) ?? null;
  const { data, isLoading, error } = useProducts({
    category: categorySlug,
    search: search.trim() || undefined,
    filters,
    sort,
    page,
    pageSize: 24,
  });

  const facets = React.useMemo(() => {
    const items = data?.items ?? [];
    const tagSet = new Set<string>();
    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    for (const p of items) {
      for (const t of p.tags ?? []) tagSet.add(t);
      min = Math.min(min, p.price);
      max = Math.max(max, p.price);
    }
    const tags = Array.from(tagSet).slice(0, 12);
    const price = Number.isFinite(min) ? { min, max } : undefined;
    return { tags, price };
  }, [data?.items]);

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

  const applyFilters = (next: CatalogFilters) => {
    setFilters(next);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onNavigateToShop}>
            <Text style={styles.brandName}>{config.brand?.name ?? 'Shop'}</Text>
          </TouchableOpacity>
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
        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={onNavigateToShop}>
            <Text style={styles.breadcrumbLink}>Shop</Text>
          </TouchableOpacity>
          <Text style={styles.breadcrumbSeparator}>›</Text>
          <Text style={styles.breadcrumbCurrent}>{category?.name ?? categorySlug}</Text>
        </View>

        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{category?.name ?? 'Category'}</Text>
          <Text style={styles.categoryDescription}>
            {category?.description ?? 'Browse products in this category.'}
          </Text>
        </View>

        {error ? <ErrorState style={styles.errorContainer} description={error} /> : null}

        <View style={styles.layout}>
          {/* Sidebar */}
          <View style={styles.sidebar}>
            <Card style={styles.sidebarCard}>
              <CardContent style={styles.sidebarContent}>
                <View style={styles.sidebarSection}>
                  <View style={styles.categoryHeaderRow}>
                    <Text style={styles.sectionTitle}>Category</Text>
                    <Button variant="ghost" size="sm" onPress={onNavigateToShop}>
                      All categories
                    </Button>
                  </View>
                  <Text style={styles.categoryName}>{category?.name ?? categorySlug}</Text>
                  <Text style={styles.categoryDesc}>
                    {category?.description ?? 'Browse products in this category.'}
                  </Text>
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
                  onChange={applyFilters}
                  onClear={clearFilters}
                  enabledFilters={enabledFilters}
                />
              </CardContent>
            </Card>
          </View>

          {/* Main Content */}
          <View style={styles.main}>
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
                  layout={storefrontSettings.categoryLayout.layout}
                  imageCrop={storefrontSettings.categoryLayout.imageCrop}
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

        <QuickViewDialog
          product={quickViewProduct}
          open={isQuickViewOpen}
          onOpenChange={setIsQuickViewOpen}
          onAddToCart={(p, v, qty) => addToCart(p, v, qty)}
        />
      </ScrollView>
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
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  breadcrumbLink: {
    fontSize: 14,
    color: '#737373',
  },
  breadcrumbSeparator: {
    fontSize: 14,
    color: '#d4d4d4',
  },
  breadcrumbCurrent: {
    fontSize: 14,
    color: '#171717',
  },
  categoryHeader: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#171717',
    letterSpacing: -0.5,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#737373',
    marginTop: 4,
  },
  errorContainer: {
    marginTop: 16,
  },
  layout: {
    flexDirection: 'row',
    gap: 20,
  },
  sidebar: {
    width: 280,
    display: 'none', // Hide on mobile
  },
  sidebarCard: {
    borderRadius: 12,
  },
  sidebarContent: {
    gap: 20,
    padding: 16,
  },
  sidebarSection: {
    gap: 8,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginTop: 4,
  },
  categoryDesc: {
    fontSize: 14,
    color: '#737373',
    marginTop: 4,
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
  productGridSkeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  productSkeleton: {
    width: '47%',
    aspectRatio: 4 / 5,
    borderRadius: 12,
  },
  productsSection: {
    marginTop: 8,
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
