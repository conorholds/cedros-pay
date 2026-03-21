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
exports.ProductGrid = ProductGrid;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const ProductCard_1 = require("./ProductCard");
const { width: screenWidth } = react_native_1.Dimensions.get('window');
const GAP = 16;
function ProductGrid({ products, columns, onAddToCart, onQuickView, onProductPress, style, layout, imageCrop, }) {
    const numColumns = columns?.base ?? 2;
    const getItemWidth = () => {
        const totalGap = (numColumns - 1) * GAP;
        return (screenWidth - 32 - totalGap) / numColumns; // 32 for container padding
    };
    const renderItem = ({ item }) => (<react_native_1.View style={[styles.item, { width: getItemWidth() }]}>
      <ProductCard_1.ProductCard product={item} onPress={() => onProductPress?.(item)} onAddToCart={onAddToCart} onQuickView={onQuickView} layout={layout} imageCrop={imageCrop}/>
    </react_native_1.View>);
    return (<react_native_1.FlatList data={products} renderItem={renderItem} keyExtractor={(item) => item.id} numColumns={numColumns} contentContainerStyle={[styles.container, style]} columnWrapperStyle={numColumns > 1 ? styles.row : undefined} showsVerticalScrollIndicator={false}/>);
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=ProductGrid.js.map