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
exports.FilterSidebar = FilterSidebar;
const React = __importStar(require("react"));
const react_native_1 = require("react-native");
const button_1 = require("../ui/button");
const input_1 = require("../ui/input");
const label_1 = require("../ui/label");
const separator_1 = require("../ui/separator");
/**
 * FilterSidebar - A sidebar-style filter panel for mobile/drawer use.
 * Alias for FilterPanel with a different name for semantic purposes.
 */
function FilterSidebar({ facets, value, onChange, onClear, style, enabledFilters, }) {
    const tags = facets.tags ?? [];
    const activeTags = new Set(value.tags ?? []);
    // Default to all filters enabled
    const showTags = enabledFilters?.tags ?? true;
    const showPriceRange = enabledFilters?.priceRange ?? true;
    const showInStock = enabledFilters?.inStock ?? true;
    // If no filters are enabled, don't render anything
    const hasAnyFilter = showTags || showPriceRange || showInStock;
    if (!hasAnyFilter)
        return null;
    return (<react_native_1.View style={[styles.container, style]}>
      <react_native_1.View style={styles.header}>
        <react_native_1.Text style={styles.headerText}>Filters</react_native_1.Text>
        <button_1.Button size="sm" variant="ghost" onPress={onClear}>
          Clear
        </button_1.Button>
      </react_native_1.View>
      <separator_1.Separator />

      <react_native_1.ScrollView showsVerticalScrollIndicator={false}>
        {showTags && tags.length ? (<react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionTitle}>Tags</react_native_1.Text>
            <react_native_1.View style={styles.tagsList}>
              {tags.map((t) => {
                const isChecked = activeTags.has(t);
                return (<react_native_1.TouchableOpacity key={t} style={styles.tagRow} onPress={() => {
                        const next = new Set(activeTags);
                        if (isChecked)
                            next.delete(t);
                        else
                            next.add(t);
                        onChange({ ...value, tags: Array.from(next) });
                    }}>
                    <react_native_1.View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <react_native_1.Text style={styles.checkmark}>✓</react_native_1.Text>}
                    </react_native_1.View>
                    <react_native_1.Text style={styles.tagText}>{t}</react_native_1.Text>
                  </react_native_1.TouchableOpacity>);
            })}
            </react_native_1.View>
          </react_native_1.View>) : null}

        {showPriceRange && facets.price ? (<react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionTitle}>Price</react_native_1.Text>
            <react_native_1.View style={styles.priceInputs}>
              <react_native_1.View style={styles.priceInputContainer}>
                <label_1.Label style={styles.priceLabel}>Min</label_1.Label>
                <input_1.Input keyboardType="decimal-pad" placeholder={String(facets.price.min)} value={value.priceMin !== undefined ? String(value.priceMin) : ''} onChangeText={(text) => {
                const n = Number(text);
                onChange({ ...value, priceMin: Number.isFinite(n) && text !== '' ? n : undefined });
            }} style={styles.priceInput}/>
              </react_native_1.View>
              <react_native_1.View style={styles.priceInputContainer}>
                <label_1.Label style={styles.priceLabel}>Max</label_1.Label>
                <input_1.Input keyboardType="decimal-pad" placeholder={String(facets.price.max)} value={value.priceMax !== undefined ? String(value.priceMax) : ''} onChangeText={(text) => {
                const n = Number(text);
                onChange({ ...value, priceMax: Number.isFinite(n) && text !== '' ? n : undefined });
            }} style={styles.priceInput}/>
              </react_native_1.View>
            </react_native_1.View>
          </react_native_1.View>) : null}

        {showInStock ? (<react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionTitle}>Availability</react_native_1.Text>
            <react_native_1.TouchableOpacity style={styles.tagRow} onPress={() => onChange({ ...value, inStock: !(value.inStock ?? false) })}>
              <react_native_1.View style={[styles.checkbox, (value.inStock ?? false) && styles.checkboxChecked]}>
                {(value.inStock ?? false) && <react_native_1.Text style={styles.checkmark}>✓</react_native_1.Text>}
              </react_native_1.View>
              <react_native_1.Text style={styles.tagText}>In stock</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>) : null}
      </react_native_1.ScrollView>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
        gap: 16,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#171717',
    },
    section: {
        gap: 12,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#171717',
    },
    tagsList: {
        gap: 8,
    },
    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#d4d4d4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#171717',
        borderColor: '#171717',
    },
    checkmark: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    tagText: {
        fontSize: 16,
        color: '#404040',
    },
    priceInputs: {
        flexDirection: 'row',
        gap: 12,
    },
    priceInputContainer: {
        flex: 1,
        gap: 6,
    },
    priceLabel: {
        fontSize: 14,
    },
    priceInput: {
        height: 44,
    },
});
//# sourceMappingURL=FilterSidebar.js.map