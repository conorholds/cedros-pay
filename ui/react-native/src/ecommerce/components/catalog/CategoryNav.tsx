import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import type { Category } from '../../types';

export interface CategoryNavProps {
  categories: Category[];
  activeSlug?: string;
  onSelect?: (category: Category) => void;
  style?: ViewStyle;
}

export function CategoryNav({
  categories,
  activeSlug,
  onSelect,
  style,
}: CategoryNavProps) {
  return (
    <ScrollView style={style} accessibilityLabel="Categories" showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        {categories.map((c) => {
          const isActive = activeSlug === c.slug;
          return (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.categoryButton,
                isActive ? styles.activeButton : styles.inactiveButton,
              ]}
              onPress={() => onSelect?.(c)}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.categoryText,
                  isActive ? styles.activeText : styles.inactiveText,
                ]}
                numberOfLines={1}
              >
                {c.name}
              </Text>
              <Text style={[styles.chevron, isActive && styles.activeChevron]}>›</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeButton: {
    backgroundColor: '#171717',
  },
  inactiveButton: {
    backgroundColor: 'transparent',
  },
  categoryText: {
    fontSize: 14,
    flex: 1,
  },
  activeText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  inactiveText: {
    color: '#404040',
  },
  chevron: {
    fontSize: 12,
    opacity: 0.7,
    color: '#737373',
  },
  activeChevron: {
    color: '#ffffff',
  },
});
