import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQAccordionProps {
  items: FAQItem[];
  allowMultiple?: boolean;
  style?: ViewStyle;
}

// Enable layout animations on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <View style={styles.chevron}>
      <Text style={[styles.chevronText, expanded && styles.chevronRotated]}>
        ▼
      </Text>
    </View>
  );
}

export function FAQAccordion({
  items,
  allowMultiple = false,
  style,
}: FAQAccordionProps) {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setExpandedIds((prev) => {
      const newSet = new Set(allowMultiple ? prev : []);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <View style={[styles.container, style]}>
      {items.map((item) => {
        const isExpanded = expandedIds.has(item.id);

        return (
          <View key={item.id} style={styles.item}>
            <TouchableOpacity
              onPress={() => toggleItem(item.id)}
              style={styles.questionContainer}
              activeOpacity={0.7}
            >
              <Text style={styles.question}>{item.question}</Text>
              <ChevronIcon expanded={isExpanded} />
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.answerContainer}>
                <Text style={styles.answer}>{item.answer}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  item: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingRight: 8,
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    color: '#171717',
    flex: 1,
    paddingRight: 16,
  },
  chevron: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    fontSize: 12,
    color: '#737373',
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  answerContainer: {
    paddingBottom: 16,
    paddingRight: 32,
  },
  answer: {
    fontSize: 14,
    color: '#525252',
    lineHeight: 20,
  },
});
