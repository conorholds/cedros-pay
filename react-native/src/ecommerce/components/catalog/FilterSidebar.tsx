import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';

export type CatalogFilters = {
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
};

export type CatalogFacets = {
  tags?: string[];
  price?: { min: number; max: number };
};

/** Which filters are enabled/visible */
export type EnabledFilters = {
  tags?: boolean;
  priceRange?: boolean;
  inStock?: boolean;
};

export interface FilterSidebarProps {
  facets: CatalogFacets;
  value: CatalogFilters;
  onChange: (next: CatalogFilters) => void;
  onClear: () => void;
  style?: ViewStyle;
  /** Which filters to show (defaults to all) */
  enabledFilters?: EnabledFilters;
}

/**
 * FilterSidebar - A sidebar-style filter panel for mobile/drawer use.
 * Alias for FilterPanel with a different name for semantic purposes.
 */
export function FilterSidebar({
  facets,
  value,
  onChange,
  onClear,
  style,
  enabledFilters,
}: FilterSidebarProps) {
  const tags = facets.tags ?? [];
  const activeTags = new Set(value.tags ?? []);

  // Default to all filters enabled
  const showTags = enabledFilters?.tags ?? true;
  const showPriceRange = enabledFilters?.priceRange ?? true;
  const showInStock = enabledFilters?.inStock ?? true;

  // If no filters are enabled, don't render anything
  const hasAnyFilter = showTags || showPriceRange || showInStock;
  if (!hasAnyFilter) return null;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Filters</Text>
        <Button size="sm" variant="ghost" onPress={onClear}>
          Clear
        </Button>
      </View>
      <Separator />

      <ScrollView showsVerticalScrollIndicator={false}>
        {showTags && tags.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsList}>
              {tags.map((t) => {
                const isChecked = activeTags.has(t);
                return (
                  <TouchableOpacity
                    key={t}
                    style={styles.tagRow}
                    onPress={() => {
                      const next = new Set(activeTags);
                      if (isChecked) next.delete(t);
                      else next.add(t);
                      onChange({ ...value, tags: Array.from(next) });
                    }}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.tagText}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {showPriceRange && facets.price ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price</Text>
            <View style={styles.priceInputs}>
              <View style={styles.priceInputContainer}>
                <Label style={styles.priceLabel}>Min</Label>
                <Input
                  keyboardType="decimal-pad"
                  placeholder={String(facets.price.min)}
                  value={value.priceMin !== undefined ? String(value.priceMin) : ''}
                  onChangeText={(text: string) => {
                    const n = Number(text);
                    onChange({ ...value, priceMin: Number.isFinite(n) && text !== '' ? n : undefined });
                  }}
                  style={styles.priceInput}
                />
              </View>
              <View style={styles.priceInputContainer}>
                <Label style={styles.priceLabel}>Max</Label>
                <Input
                  keyboardType="decimal-pad"
                  placeholder={String(facets.price.max)}
                  value={value.priceMax !== undefined ? String(value.priceMax) : ''}
                  onChangeText={(text: string) => {
                    const n = Number(text);
                    onChange({ ...value, priceMax: Number.isFinite(n) && text !== '' ? n : undefined });
                  }}
                  style={styles.priceInput}
                />
              </View>
            </View>
          </View>
        ) : null}

        {showInStock ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <TouchableOpacity
              style={styles.tagRow}
              onPress={() => onChange({ ...value, inStock: !(value.inStock ?? false) })}
            >
              <View style={[styles.checkbox, (value.inStock ?? false) && styles.checkboxChecked]}>
                {(value.inStock ?? false) && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.tagText}>In stock</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
