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
exports.ProductCard = ProductCard;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const badge_1 = require("../ui/badge");
const button_1 = require("../ui/button");
const card_1 = require("../ui/card");
const Price_1 = require("./Price");
const ASPECT_RATIOS = {
    large: 4 / 5,
    square: 1,
    compact: 3 / 4,
};
function ProductCard({ product, onPress, onAddToCart, onQuickView, style, layout = 'large', imageCrop = 'center', }) {
    const isOutOfStock = product.inventoryStatus === 'out_of_stock' ||
        (typeof product.inventoryQuantity === 'number' && product.inventoryQuantity <= 0);
    const lowStockQty = typeof product.inventoryQuantity === 'number' ? product.inventoryQuantity : null;
    const resizeMode = imageCrop === 'center' ? 'cover' : imageCrop;
    const padding = layout === 'compact' ? 12 : 16;
    const titleSize = layout === 'compact' ? styles.titleCompact : styles.titleDefault;
    return (<card_1.Card style={[styles.card, style]}>
      <react_native_1.View style={styles.imageSection}>
        <react_native_1.TouchableOpacity onPress={onPress} activeOpacity={0.9} accessibilityLabel={`View ${product.title}`}>
          <react_native_1.View style={[styles.imageContainer, { aspectRatio: ASPECT_RATIOS[layout] }]}>
            <react_native_1.Image source={{ uri: product.images[0]?.url }} style={[styles.image, { resizeMode: resizeMode }]} accessibilityLabel={product.images[0]?.alt ?? product.title}/>
          </react_native_1.View>
        </react_native_1.TouchableOpacity>

        {layout !== 'compact' && product.tags?.length ? (<react_native_1.View style={styles.tagsContainer}>
            {product.tags.slice(0, 2).map((t) => (<badge_1.Badge key={t} variant="secondary" style={styles.tagBadge} textStyle={styles.tagText}>
                {t}
              </badge_1.Badge>))}
          </react_native_1.View>) : null}

        {isOutOfStock ? (<react_native_1.View style={styles.stockBadge}>
            <badge_1.Badge variant="secondary" style={styles.tagBadge} textStyle={styles.tagText}>
              Out of stock
            </badge_1.Badge>
          </react_native_1.View>) : lowStockQty != null && lowStockQty > 0 && lowStockQty <= 5 ? (<react_native_1.View style={styles.stockBadge}>
            <badge_1.Badge variant="secondary" style={styles.tagBadge} textStyle={styles.tagText}>
              Only {lowStockQty} left
            </badge_1.Badge>
          </react_native_1.View>) : null}

        {onQuickView ? (<react_native_1.View style={styles.quickViewContainer}>
            <button_1.Button size="sm" variant="secondary" onPress={() => onQuickView(product)}>
              Quick view
            </button_1.Button>
          </react_native_1.View>) : null}
      </react_native_1.View>

      <react_native_1.View style={[styles.content, { padding }]}>
        <react_native_1.View style={styles.contentTop}>
          <react_native_1.View style={styles.textContainer}>
            <react_native_1.Text style={[styles.title, titleSize]} numberOfLines={1}>
              {product.title}
            </react_native_1.Text>
            <react_native_1.View style={styles.priceContainer}>
              <Price_1.Price amount={product.price} currency={product.currency} compareAt={product.compareAtPrice} size={layout === 'compact' ? 'sm' : 'default'}/>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.View>

        {layout === 'large' && (<react_native_1.Text style={styles.description} numberOfLines={2}>
            {product.description}
          </react_native_1.Text>)}

        <react_native_1.View style={layout === 'compact' ? styles.buttonContainerCompact : styles.buttonContainer}>
          <button_1.Button size={layout === 'compact' ? 'sm' : 'default'} onPress={() => onAddToCart?.(product, null)} disabled={isOutOfStock} style={styles.addToCartButton}>
            {isOutOfStock ? 'Out of stock' : 'Add to cart'}
          </button_1.Button>
        </react_native_1.View>
      </react_native_1.View>
    </card_1.Card>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=ProductCard.js.map