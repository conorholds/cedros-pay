/**
 * FAQ List Component for React Native
 *
 * Displays a list of FAQs with optional accordion behavior.
 */

import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { FAQItem, type FAQItemData } from './FAQItem';

export interface FAQListProps {
  faqs: FAQItemData[];
  style?: ViewStyle;
  /** Accordion mode - only one item expanded at a time */
  accordion?: boolean;
  /** Show keywords/tags on each item */
  showKeywords?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Style for empty state text */
  emptyMessageStyle?: TextStyle;
  /** Style for individual FAQ items */
  itemStyle?: ViewStyle;
}

export function FAQList({
  faqs,
  style,
  accordion = false,
  showKeywords = false,
  emptyMessage = 'No FAQs available.',
  emptyMessageStyle,
  itemStyle,
}: FAQListProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Filter to only active FAQs
  const activeFaqs = faqs.filter((faq) => faq.active !== false);

  if (activeFaqs.length === 0) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={[styles.emptyText, emptyMessageStyle]}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {activeFaqs.map((faq) => (
        <FAQItem
          key={faq.id}
          faq={faq}
          style={itemStyle}
          showKeywords={showKeywords}
          expanded={accordion ? expandedId === faq.id : undefined}
          onExpandedChange={
            accordion
              ? (expanded) => setExpandedId(expanded ? faq.id : null)
              : undefined
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
  },
});
