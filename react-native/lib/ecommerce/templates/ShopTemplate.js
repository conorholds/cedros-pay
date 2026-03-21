"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopTemplate = ShopTemplate;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const context_1 = require("../config/context");
const CartProvider_1 = require("../state/cart/CartProvider");
const useCategories_1 = require("../hooks/useCategories");
const useProducts_1 = require("../hooks/useProducts");
const useStorefrontSettings_1 = require("../hooks/useStorefrontSettings");
const cartItemMetadata_1 = require("../utils/cartItemMetadata");
const button_1 = require("../components/ui/button");
const card_1 = require("../components/ui/card");
const CategoryNav_1 = require("../components/catalog/CategoryNav");
const FilterPanel_1 = require("../components/catalog/FilterPanel");
const ProductGrid_1 = require("../components/catalog/ProductGrid");
const SearchInput_1 = require("../components/catalog/SearchInput");
const skeleton_1 = require("../components/ui/skeleton");
const ErrorState_1 = require("../components/general/ErrorState");
const CartSidebar_1 = require("../components/cart/CartSidebar");
const QuickViewDialog_1 = require("../components/catalog/QuickViewDialog");
function computeFacets(products) {
    const tagSet = new Set();
    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    for (const p of products) {
        for (const t of p.tags ?? [])
            tagSet.add(t);
        min = Math.min(min, p.price);
        max = Math.max(max, p.price);
    }
    const tags = Array.from(tagSet).slice(0, 12);
    const price = Number.isFinite(min) ? { min, max } : undefined;
    return { tags, price };
}
function ShopTemplate({ style, initialCategorySlug, onNavigateToProduct, onNavigateToCheckout, }) {
    const { config } = (0, context_1.useCedrosShop)();
    const cart = (0, CartProvider_1.useCart)();
    const { categories, isLoading: catsLoading, error: catsError } = (0, useCategories_1.useCategories)();
    const [search, setSearch] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState(initialCategorySlug);
    const [page, setPage] = React.useState(1);
    const [sort, setSort] = React.useState('featured');
    const [filters, setFilters] = React.useState({});
    const { data, isLoading, error } = (0, useProducts_1.useProducts)({
        category: activeCategory,
        search: search.trim() || undefined,
        filters,
        sort,
        page,
        pageSize: 24,
    });
    const facets = React.useMemo(() => computeFacets(data?.items ?? []), [data?.items]);
    // Storefront settings for filter/sort visibility
    const { settings: storefrontSettings } = (0, useStorefrontSettings_1.useStorefrontSettings)();
    const enabledFilters = storefrontSettings.catalog.filters;
    const enabledSort = storefrontSettings.catalog.sort;
    // Build available sort options based on settings
    const sortOptions = React.useMemo(() => {
        const opts = [];
        if (enabledSort.featured)
            opts.push({ value: 'featured', label: 'Featured' });
        if (enabledSort.priceAsc)
            opts.push({ value: 'price_asc', label: 'Price: Low to High' });
        if (enabledSort.priceDesc)
            opts.push({ value: 'price_desc', label: 'Price: High to Low' });
        if (opts.length === 0)
            opts.push({ value: 'featured', label: 'Featured' });
        return opts;
    }, [enabledSort]);
    const [isCartOpen, setIsCartOpen] = React.useState(false);
    const [quickViewProduct, setQuickViewProduct] = React.useState(null);
    const [isQuickViewOpen, setIsQuickViewOpen] = React.useState(false);
    const onSelectCategory = (c) => {
        setActiveCategory(c.slug);
        setPage(1);
    };
    const addToCart = React.useCallback((product, variant, qty) => {
        cart.addItem({
            productId: product.id,
            variantId: variant?.id,
            unitPrice: product.price,
            currency: product.currency,
            titleSnapshot: variant ? `${product.title} — ${variant.title}` : product.title,
            imageSnapshot: product.images[0]?.url,
            paymentResource: product.id,
            metadata: (0, cartItemMetadata_1.buildCartItemMetadataFromProduct)(product),
        }, qty);
    }, [cart]);
    return (<react_native_1.View style={[styles.container, style]}>
      {/* Header */}
      <react_native_1.View style={styles.header}>
        <react_native_1.View style={styles.headerContent}>
          <react_native_1.Text style={styles.brandName}>{config.brand?.name ?? 'Shop'}</react_native_1.Text>
          <react_native_1.View style={styles.searchContainer}>
            <SearchInput_1.SearchInput value={search} onChange={setSearch}/>
          </react_native_1.View>
          <CartSidebar_1.CartSidebar open={isCartOpen} onOpenChange={setIsCartOpen} onCheckout={() => onNavigateToCheckout?.()} trigger={<button_1.Button variant="outline" onPress={() => setIsCartOpen(true)}>
                Cart ({cart.count})
              </button_1.Button>}/>
          <button_1.Button onPress={() => onNavigateToCheckout?.()}>Checkout</button_1.Button>
        </react_native_1.View>
      </react_native_1.View>

      <react_native_1.ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <react_native_1.View style={styles.layout}>
          {/* Sidebar */}
          <react_native_1.View style={styles.sidebar}>
            <card_1.Card style={styles.sidebarCard}>
              <card_1.CardHeader>
                <card_1.CardTitle style={styles.sidebarTitle}>Browse</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent style={styles.sidebarContent}>
                <react_native_1.View style={styles.sidebarSection}>
                  <react_native_1.Text style={styles.sectionTitle}>Categories</react_native_1.Text>
                  {catsError ? <ErrorState_1.ErrorState description={catsError}/> : null}
                  {catsLoading ? (<react_native_1.View style={styles.skeletonList}>
                      <skeleton_1.Skeleton style={styles.skeletonItem}/>
                      <skeleton_1.Skeleton style={styles.skeletonItem}/>
                      <skeleton_1.Skeleton style={styles.skeletonItem}/>
                    </react_native_1.View>) : (<CategoryNav_1.CategoryNav categories={categories} activeSlug={activeCategory} onSelect={onSelectCategory}/>)}
                </react_native_1.View>

                {sortOptions.length > 1 && (<react_native_1.View style={styles.sidebarSection}>
                    <react_native_1.Text style={styles.sectionTitle}>Sort</react_native_1.Text>
                    <react_native_1.View style={styles.sortOptions}>
                      {sortOptions.map((opt) => (<react_native_1.TouchableOpacity key={opt.value} style={[
                    styles.sortOption,
                    sort === opt.value && styles.sortOptionActive,
                ]} onPress={() => {
                    setSort(opt.value);
                    setPage(1);
                }}>
                          <react_native_1.Text style={[
                    styles.sortOptionText,
                    sort === opt.value && styles.sortOptionTextActive,
                ]}>
                            {opt.label}
                          </react_native_1.Text>
                        </react_native_1.TouchableOpacity>))}
                    </react_native_1.View>
                  </react_native_1.View>)}

                <FilterPanel_1.FilterPanel facets={facets} value={filters} onChange={(next) => {
            setFilters(next);
            setPage(1);
        }} onClear={() => {
            setFilters({});
            setPage(1);
        }} enabledFilters={enabledFilters}/>
              </card_1.CardContent>
            </card_1.Card>
          </react_native_1.View>

          {/* Main Content */}
          <react_native_1.View style={styles.main}>
            <react_native_1.View style={styles.mainHeader}>
              <react_native_1.Text style={styles.pageTitle}>
                {storefrontSettings.shopPage.title || 'Shop'}
              </react_native_1.Text>
              {storefrontSettings.shopPage.description && (<react_native_1.Text style={styles.pageDescription}>
                  {storefrontSettings.shopPage.description}
                </react_native_1.Text>)}
            </react_native_1.View>

            {error ? <ErrorState_1.ErrorState description={error}/> : null}
            {isLoading ? (<react_native_1.View style={styles.productGridSkeleton}>
                {Array.from({ length: 8 }).map((_, i) => (<skeleton_1.Skeleton key={i} style={styles.productSkeleton}/>))}
              </react_native_1.View>) : (<react_native_1.View style={styles.productsSection}>
                <ProductGrid_1.ProductGrid products={data?.items ?? []} columns={config.ui?.productGrid?.columns} onAddToCart={(p) => addToCart(p, null, 1)} onQuickView={(p) => {
                setQuickViewProduct(p);
                setIsQuickViewOpen(true);
            }} onProductPress={onNavigateToProduct} layout={storefrontSettings.shopLayout.layout} imageCrop={storefrontSettings.shopLayout.imageCrop}/>
                <react_native_1.View style={styles.pagination}>
                  <button_1.Button variant="outline" disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </button_1.Button>
                  <react_native_1.Text style={styles.pageNumber}>Page {page}</react_native_1.Text>
                  <button_1.Button variant="outline" disabled={!data?.hasNextPage} onPress={() => setPage((p) => p + 1)}>
                    Next
                  </button_1.Button>
                </react_native_1.View>
              </react_native_1.View>)}
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.ScrollView>

      <QuickViewDialog_1.QuickViewDialog product={quickViewProduct} open={isQuickViewOpen} onOpenChange={setIsQuickViewOpen} onAddToCart={(p, v, qty) => addToCart(p, v, qty)}/>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=ShopTemplate.js.map