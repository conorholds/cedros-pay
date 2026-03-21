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
exports.ProductList = ProductList;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const ProductCard_1 = require("./ProductCard");
function ProductList({ products, onAddToCart, onQuickView, onProductPress, style, layout, imageCrop, }) {
    const renderItem = ({ item }) => (<react_native_1.View style={styles.item}>
      <ProductCard_1.ProductCard product={item} onPress={() => onProductPress?.(item)} onAddToCart={onAddToCart} onQuickView={onQuickView} layout={layout} imageCrop={imageCrop} style={styles.card}/>
    </react_native_1.View>);
    return (<react_native_1.FlatList data={products} renderItem={renderItem} keyExtractor={(item) => item.id} contentContainerStyle={[styles.container, style]} showsVerticalScrollIndicator={false}/>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
    },
    item: {
        width: '100%',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
//# sourceMappingURL=ProductList.js.map