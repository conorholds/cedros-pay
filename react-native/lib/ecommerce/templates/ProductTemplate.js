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
exports.ProductTemplate = ProductTemplate;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const CartProvider_1 = require("../state/cart/CartProvider");
const useProduct_1 = require("../hooks/useProduct");
const useProducts_1 = require("../hooks/useProducts");
const useStorefrontSettings_1 = require("../hooks/useStorefrontSettings");
const useAIRelatedProducts_1 = require("../hooks/useAIRelatedProducts");
const cartItemMetadata_1 = require("../utils/cartItemMetadata");
const ProductGallery_1 = require("../components/catalog/ProductGallery");
const VariantSelector_1 = require("../components/catalog/VariantSelector");
const QuantitySelector_1 = require("../components/catalog/QuantitySelector");
const Price_1 = require("../components/catalog/Price");
const button_1 = require("../components/ui/button");
const skeleton_1 = require("../components/ui/skeleton");
const ErrorState_1 = require("../components/general/ErrorState");
const ProductGrid_1 = require("../components/catalog/ProductGrid");
const csvHelpers_1 = require("../../utils/csvHelpers");
function ProductTemplate({ slug, style, onNavigateToCheckout, onNavigateToProduct, }) {
    const cart = (0, CartProvider_1.useCart)();
    const { product, isLoading, error } = (0, useProduct_1.useProduct)(slug);
    const [qty, setQty] = React.useState(1);
    const [selected, setSelected] = React.useState({
        selectedOptions: {},
        variant: null,
    });
    React.useEffect(() => {
        if (!product || !product.variants?.length)
            return;
        const first = product.variants[0];
        setSelected({ selectedOptions: { ...first.options }, variant: first });
    }, [product?.id]);
    // Storefront settings for related products
    const { settings: storefrontSettings } = (0, useStorefrontSettings_1.useStorefrontSettings)();
    const { mode, maxItems } = storefrontSettings.relatedProducts;
    // AI recommendations (only fetched when mode is 'ai')
    const aiRecommendations = (0, useAIRelatedProducts_1.useAIRelatedProducts)({
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
    const related = (0, useProducts_1.useProducts)(relatedQuery);
    // Filter and select related products based on mode
    const relatedItems = React.useMemo(() => {
        const allProducts = related.data?.items ?? [];
        const filtered = allProducts.filter((p) => p.slug !== slug);
        if (mode === 'manual' && product) {
            const relatedIdsRaw = product.attributes?.relatedProductIds || product.attributes?.related_product_ids;
            if (relatedIdsRaw) {
                const relatedIds = (0, csvHelpers_1.parseCsv)(String(relatedIdsRaw));
                if (relatedIds.length > 0) {
                    const byId = new Map(filtered.map((p) => [p.id, p]));
                    const manual = relatedIds.map((id) => byId.get(id)).filter((p) => !!p);
                    return manual.slice(0, maxItems);
                }
            }
        }
        if (mode === 'ai') {
            if (aiRecommendations.relatedProductIds && aiRecommendations.relatedProductIds.length > 0) {
                const byId = new Map(filtered.map((p) => [p.id, p]));
                const aiProducts = aiRecommendations.relatedProductIds
                    .map((id) => byId.get(id))
                    .filter((p) => !!p);
                if (aiProducts.length > 0) {
                    return aiProducts.slice(0, maxItems);
                }
            }
        }
        return filtered.slice(0, maxItems);
    }, [related.data?.items, slug, mode, maxItems, product, aiRecommendations.relatedProductIds]);
    if (isLoading) {
        return (<react_native_1.View style={[styles.container, style]}>
        <react_native_1.View style={styles.loadingContainer}>
          <skeleton_1.Skeleton style={styles.breadcrumbSkeleton}/>
          <react_native_1.View style={styles.productLayout}>
            <skeleton_1.Skeleton style={styles.imageSkeleton}/>
            <react_native_1.View style={styles.detailsSkeleton}>
              <skeleton_1.Skeleton style={styles.titleSkeleton}/>
              <skeleton_1.Skeleton style={styles.priceSkeleton}/>
              <skeleton_1.Skeleton style={styles.descSkeleton}/>
              <skeleton_1.Skeleton style={styles.buttonSkeleton}/>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>);
    }
    if (error) {
        return (<react_native_1.View style={[styles.container, style]}>
        <react_native_1.View style={styles.errorContainer}>
          <ErrorState_1.ErrorState description={error}/>
        </react_native_1.View>
      </react_native_1.View>);
    }
    if (!product) {
        return (<react_native_1.View style={[styles.container, style]}>
        <react_native_1.View style={styles.errorContainer}>
          <ErrorState_1.ErrorState description="Product not found."/>
        </react_native_1.View>
      </react_native_1.View>);
    }
    const unitPrice = selected.variant?.price ?? product.price;
    const compareAt = selected.variant?.compareAtPrice ?? product.compareAtPrice;
    const isOutOfStock = product.inventoryStatus === 'out_of_stock' ||
        (typeof product.inventoryQuantity === 'number' && product.inventoryQuantity <= 0);
    const handleAddToCart = () => {
        if (isOutOfStock)
            return;
        cart.addItem({
            productId: product.id,
            variantId: selected.variant?.id,
            unitPrice,
            currency: product.currency,
            titleSnapshot: selected.variant ? `${product.title} — ${selected.variant.title}` : product.title,
            imageSnapshot: product.images[0]?.url,
            paymentResource: product.id,
            metadata: (0, cartItemMetadata_1.buildCartItemMetadataFromProduct)(product),
        }, qty);
    };
    const handleBuyNow = () => {
        if (isOutOfStock)
            return;
        handleAddToCart();
        onNavigateToCheckout?.();
    };
    return (<react_native_1.ScrollView style={[styles.container, style]} contentContainerStyle={styles.content}>
      {/* Breadcrumb */}
      <react_native_1.Text style={styles.breadcrumb}>← Back to Shop</react_native_1.Text>

      <react_native_1.View style={styles.productLayout}>
        {/* Product Images */}
        <ProductGallery_1.ProductGallery images={product.images}/>

        {/* Product Details */}
        <react_native_1.View style={styles.detailsSection}>
          <react_native_1.Text style={styles.productTitle}>{product.title}</react_native_1.Text>
          <react_native_1.View style={styles.priceContainer}>
            <Price_1.Price amount={unitPrice} currency={product.currency} compareAt={compareAt}/>
          </react_native_1.View>
          {isOutOfStock ? (<react_native_1.Text style={styles.outOfStock}>Out of stock</react_native_1.Text>) : typeof product.inventoryQuantity === 'number' && product.inventoryQuantity > 0 && product.inventoryQuantity <= 5 ? (<react_native_1.Text style={styles.lowStock}>
              Only <react_native_1.Text style={styles.lowStockBold}>{product.inventoryQuantity}</react_native_1.Text> left
            </react_native_1.Text>) : null}
          <react_native_1.Text style={styles.description}>{product.description}</react_native_1.Text>

          <VariantSelector_1.VariantSelector product={product} value={{ selectedOptions: selected.selectedOptions, variantId: selected.variant?.id }} onChange={(next) => setSelected(next)}/>

          <react_native_1.View style={styles.actionRow}>
            <QuantitySelector_1.QuantitySelector qty={qty} onChange={setQty}/>
            <button_1.Button onPress={handleAddToCart} style={styles.addToCartButton} disabled={isOutOfStock}>
              {isOutOfStock ? 'Out of stock' : 'Add to cart'}
            </button_1.Button>
            <button_1.Button variant="outline" onPress={handleBuyNow} disabled={isOutOfStock}>
              Buy now
            </button_1.Button>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>

      {/* Related Products */}
      {storefrontSettings.sections.showRelatedProducts && relatedItems.length > 0 && (<react_native_1.View style={styles.relatedSection}>
          <react_native_1.Text style={styles.relatedTitle}>Related products</react_native_1.Text>
          <ProductGrid_1.ProductGrid products={relatedItems} columns={{ base: 2, md: 4, lg: 4 }} layout={storefrontSettings.relatedProducts.layout.layout} imageCrop={storefrontSettings.relatedProducts.layout.imageCrop} onAddToCart={(p) => cart.addItem({
                productId: p.id,
                unitPrice: p.price,
                currency: p.currency,
                titleSnapshot: p.title,
                imageSnapshot: p.images[0]?.url,
                paymentResource: p.id,
            }, 1)} onProductPress={onNavigateToProduct}/>
        </react_native_1.View>)}
    </react_native_1.ScrollView>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=ProductTemplate.js.map