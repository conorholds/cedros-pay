import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

export type SortOption = 'featured' | 'priceAsc' | 'priceDesc' | 'newest' | 'bestselling';

export interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  options?: SortOption[];
  style?: ViewStyle;
}

const OPTION_LABELS: Record<SortOption, string> = {
  featured: 'Featured',
  priceAsc: 'Price: Low to High',
  priceDesc: 'Price: High to Low',
  newest: 'Newest First',
  bestselling: 'Best Selling',
};

export function SortDropdown({
  value,
  onChange,
  options = ['featured', 'priceAsc', 'priceDesc', 'newest', 'bestselling'],
  style,
}: SortDropdownProps) {
  const [visible, setVisible] = React.useState(false);

  const selectedLabel = OPTION_LABELS[value];

  return (
    <View style={style}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.triggerLabel}>Sort by:</Text>
        <Text style={styles.triggerValue}>{selectedLabel}</Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.headerText}>Sort by</Text>
              <Button size="sm" variant="ghost" onPress={() => setVisible(false)}>
                Close
              </Button>
            </View>
            <Separator />
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.option,
                    value === option && styles.optionActive,
                  ]}
                  onPress={() => {
                    onChange(option);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === option && styles.optionTextActive,
                    ]}
                  >
                    {OPTION_LABELS[option]}
                  </Text>
                  {value === option && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#ffffff',
  },
  triggerLabel: {
    fontSize: 14,
    color: '#737373',
  },
  triggerValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    color: '#737373',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  optionActive: {
    backgroundColor: '#f5f5f5',
  },
  optionText: {
    fontSize: 16,
    color: '#404040',
  },
  optionTextActive: {
    fontWeight: '500',
    color: '#171717',
  },
  checkmark: {
    fontSize: 16,
    color: '#171717',
    fontWeight: '600',
  },
});
