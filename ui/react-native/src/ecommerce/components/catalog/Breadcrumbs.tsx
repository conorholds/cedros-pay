import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';

export type BreadcrumbItem = {
  label: string;
  onPress?: () => void;
};

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  style?: ViewStyle;
}

export function Breadcrumbs({ items, style }: BreadcrumbsProps) {
  return (
    <View style={[styles.container, style]} accessibilityLabel="Breadcrumb">
      {items.map((it, idx) => (
        <View key={`${it.label}-${idx}`} style={styles.item}>
          {it.onPress ? (
            <TouchableOpacity onPress={it.onPress}>
              <Text style={styles.link}>{it.label}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.current}>{it.label}</Text>
          )}
          {idx < items.length - 1 ? (
            <Text style={styles.separator} accessibilityElementsHidden>
              ·
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  link: {
    fontSize: 12,
    color: '#525252',
    textDecorationLine: 'underline',
  },
  current: {
    fontSize: 12,
    color: '#171717',
    fontWeight: '500',
  },
  separator: {
    fontSize: 12,
    color: '#737373',
  },
});
