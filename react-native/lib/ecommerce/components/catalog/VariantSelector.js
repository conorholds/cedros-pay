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
exports.VariantSelector = VariantSelector;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const button_1 = require("../ui/button");
function getOptionNames(variants) {
    const set = new Set();
    for (const v of variants) {
        for (const k of Object.keys(v.options))
            set.add(k);
    }
    return Array.from(set);
}
function getOptionValues(variants, optionName) {
    const set = new Set();
    for (const v of variants) {
        const val = v.options[optionName];
        if (val)
            set.add(val);
    }
    return Array.from(set);
}
function findVariant(variants, selected) {
    return (variants.find((v) => Object.entries(selected).every(([k, val]) => v.options[k] === val)) ?? null);
}
/**
 * Check if a variant is out of stock
 */
function isVariantOutOfStock(variant) {
    if (variant.inventoryStatus === 'out_of_stock')
        return true;
    if (typeof variant.inventoryQuantity === 'number' && variant.inventoryQuantity <= 0)
        return true;
    return false;
}
/**
 * Check if a variant has low stock
 */
function isVariantLowStock(variant) {
    if (variant.inventoryStatus === 'low')
        return true;
    if (typeof variant.inventoryQuantity === 'number' &&
        variant.inventoryQuantity > 0 &&
        variant.inventoryQuantity <= 5) {
        return true;
    }
    return false;
}
/**
 * Get inventory info for display
 */
function getInventoryInfo(variant) {
    const isOutOfStock = isVariantOutOfStock(variant);
    const isLow = !isOutOfStock && isVariantLowStock(variant);
    const quantity = typeof variant.inventoryQuantity === 'number' ? variant.inventoryQuantity : undefined;
    return { isOutOfStock, isLow, quantity };
}
/**
 * Check if selecting a particular option value would lead to any in-stock variant
 */
function wouldLeadToInStockVariant(variants, currentSelected, optionName, optionValue) {
    const hypotheticalSelected = { ...currentSelected, [optionName]: optionValue };
    // Find all variants that match the hypothetical selection (partial match)
    const matchingVariants = variants.filter((v) => Object.entries(hypotheticalSelected).every(([k, val]) => v.options[k] === val));
    // If no matching variants, this combination doesn't exist
    if (matchingVariants.length === 0)
        return false;
    // Check if any matching variant is in stock
    return matchingVariants.some((v) => !isVariantOutOfStock(v));
}
function VariantSelector({ product, value, onChange, style, showInventory = true, disableOutOfStock = false, }) {
    const variants = React.useMemo(() => product.variants ?? [], [product.variants]);
    const optionNames = React.useMemo(() => getOptionNames(variants), [variants]);
    // Get currently selected variant for inventory display
    const selectedVariant = React.useMemo(() => findVariant(variants, value.selectedOptions), [variants, value.selectedOptions]);
    const selectedInventory = React.useMemo(() => (selectedVariant ? getInventoryInfo(selectedVariant) : null), [selectedVariant]);
    if (variants.length === 0 || optionNames.length === 0)
        return null;
    return (<react_native_1.View style={[styles.container, style]}>
      {optionNames.map((optionName) => {
            const values = getOptionValues(variants, optionName);
            const selectedValue = value.selectedOptions[optionName];
            return (<react_native_1.View key={optionName} style={styles.optionSection}>
            <react_native_1.View style={styles.optionHeader}>
              <react_native_1.Text style={styles.optionName}>{optionName}</react_native_1.Text>
              <react_native_1.Text style={styles.selectedValue}>{selectedValue || 'Select'}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsContainer}>
              {values.map((v) => {
                    const isActive = v === selectedValue;
                    const hasInStockPath = wouldLeadToInStockVariant(variants, value.selectedOptions, optionName, v);
                    const isOptionDisabled = disableOutOfStock && !hasInStockPath;
                    return (<button_1.Button key={v} size="sm" variant={isActive ? 'default' : 'outline'} onPress={() => {
                            const nextSelected = { ...value.selectedOptions, [optionName]: v };
                            const variant = findVariant(variants, nextSelected);
                            onChange({ selectedOptions: nextSelected, variant });
                        }} disabled={isOptionDisabled} style={[
                            styles.optionButton,
                            !hasInStockPath && !isOptionDisabled && styles.outOfStockOption,
                        ]}>
                    {v}
                    {!hasInStockPath && !isOptionDisabled && (<react_native_1.Text style={styles.outOfStockLabel}> (Out)</react_native_1.Text>)}
                  </button_1.Button>);
                })}
            </react_native_1.ScrollView>
          </react_native_1.View>);
        })}

      {/* Selected variant inventory status */}
      {showInventory && selectedVariant && selectedInventory && (<react_native_1.View style={styles.inventorySection}>
          {selectedInventory.isOutOfStock ? (<react_native_1.Text style={styles.outOfStockText}>Out of stock</react_native_1.Text>) : selectedInventory.isLow && selectedInventory.quantity !== undefined ? (<react_native_1.Text style={styles.lowStockText}>
              Only <react_native_1.Text style={styles.lowStockQuantity}>{selectedInventory.quantity}</react_native_1.Text> left
            </react_native_1.Text>) : null}
        </react_native_1.View>)}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        gap: 16,
    },
    optionSection: {
        gap: 8,
    },
    optionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    optionName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#171717',
    },
    selectedValue: {
        fontSize: 12,
        color: '#737373',
    },
    optionsContainer: {
        gap: 8,
        paddingBottom: 4,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    outOfStockOption: {
        opacity: 0.5,
    },
    outOfStockLabel: {
        fontSize: 10,
        opacity: 0.7,
    },
    inventorySection: {
        paddingTop: 8,
    },
    outOfStockText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#dc2626',
    },
    lowStockText: {
        fontSize: 14,
        color: '#d97706',
    },
    lowStockQuantity: {
        fontWeight: '600',
    },
});
//# sourceMappingURL=VariantSelector.js.map