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
exports.QuickViewDialog = QuickViewDialog;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const dialog_1 = require("../ui/dialog");
const ProductGallery_1 = require("./ProductGallery");
const Price_1 = require("./Price");
const VariantSelector_1 = require("./VariantSelector");
const QuantitySelector_1 = require("./QuantitySelector");
const button_1 = require("../ui/button");
function QuickViewDialog({ product, open, onOpenChange, onViewDetails, onAddToCart, style, }) {
    const [qty, setQty] = React.useState(1);
    const [selected, setSelected] = React.useState({
        selectedOptions: {},
        variant: null,
    });
    React.useEffect(() => {
        if (!product)
            return;
        setQty(1);
        if (product.variants?.length) {
            const first = product.variants[0];
            setSelected({ selectedOptions: { ...first.options }, variant: first });
        }
        else {
            setSelected({ selectedOptions: {}, variant: null });
        }
        // Only reset when product identity changes, not on every property update
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id]);
    if (!product)
        return null;
    const unitPrice = selected.variant?.price ?? product.price;
    const compareAt = selected.variant?.compareAtPrice ?? product.compareAtPrice;
    return (<dialog_1.Dialog open={open} onOpenChange={onOpenChange}>
      <dialog_1.DialogContent style={[styles.content, style]}>
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle style={styles.titleRow}>
            <react_native_1.Text style={styles.titleText} numberOfLines={1}>
              {product.title}
            </react_native_1.Text>
            {onViewDetails ? (<react_native_1.TouchableOpacity onPress={() => onViewDetails(product.slug)}>
                <react_native_1.Text style={styles.viewDetails}>View details</react_native_1.Text>
              </react_native_1.TouchableOpacity>) : null}
          </dialog_1.DialogTitle>
        </dialog_1.DialogHeader>

        <react_native_1.ScrollView showsVerticalScrollIndicator={false}>
          <react_native_1.View style={styles.contentContainer}>
            <ProductGallery_1.ProductGallery images={product.images}/>
            <react_native_1.View style={styles.detailsSection}>
              <react_native_1.View>
                <Price_1.Price amount={unitPrice} currency={product.currency} compareAt={compareAt}/>
                <react_native_1.Text style={styles.description}>{product.description}</react_native_1.Text>
              </react_native_1.View>

              <VariantSelector_1.VariantSelector product={product} value={{ selectedOptions: selected.selectedOptions, variantId: selected.variant?.id }} onChange={(next) => setSelected(next)}/>

              <react_native_1.View style={styles.quantityRow}>
                <QuantitySelector_1.QuantitySelector qty={qty} onChange={setQty}/>
                <button_1.Button style={styles.addToCartButton} onPress={() => {
            onAddToCart(product, selected.variant, qty);
            onOpenChange(false);
        }}>
                  Add to cart
                </button_1.Button>
              </react_native_1.View>

              <react_native_1.Text style={styles.inventoryText}>
                {product.inventoryStatus === 'out_of_stock' ? 'Out of stock' : 'In stock'}
              </react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>
        </react_native_1.ScrollView>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=QuickViewDialog.js.map