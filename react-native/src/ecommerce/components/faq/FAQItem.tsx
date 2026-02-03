/**
 * FAQ Item Component for React Native
 *
 * Displays a single FAQ with question, answer, and optional metadata.
 * Supports expandable/collapsible behavior.
 */

import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface FAQItemData {
  id: string;
  question: string;
  answer: string;
  keywords?: string[];
  active?: boolean;
}

export interface FAQItemProps {
  faq: FAQItemData;
  style?: ViewStyle;
  /** Whether the item is expanded (controlled) */
  expanded?: boolean;
  /** Default expanded state (uncontrolled) */
  defaultExpanded?: boolean;
  /** Callback when expanded state changes */
  onExpandedChange?: (expanded: boolean) => void;
  /** Show keywords/tags */
  showKeywords?: boolean;
  /** Style for the question text */
  questionStyle?: TextStyle;
  /** Style for the answer text */
  answerStyle?: TextStyle;
  /** Style for keyword badges */
  keywordStyle?: ViewStyle;
  /** Style for keyword text */
  keywordTextStyle?: TextStyle;
}

export function FAQItem({
  faq,
  style,
  expanded: controlledExpanded,
  defaultExpanded = false,
  onExpandedChange,
  showKeywords = false,
  questionStyle,
  answerStyle,
  keywordStyle,
  keywordTextStyle,
}: FAQItemProps) {
  const [internalExpanded, setInternalExpanded] = React.useState(defaultExpanded);

  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const rotateAnim = React.useRef(new Animated.Value(expanded ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = !expanded;
    if (!isControlled) {
      setInternalExpanded(newExpanded);
    }
    onExpandedChange?.(newExpanded);
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={handleToggle}
        style={styles.header}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={[styles.question, questionStyle]}>{faq.question}</Text>
        <Animated.Text
          style={[
            styles.chevron,
            {
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  }),
                },
              ],
            },
          ]}
        >
          ▾
        </Animated.Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <Text style={[styles.answer, answerStyle]}>{faq.answer}</Text>

          {showKeywords && faq.keywords && faq.keywords.length > 0 && (
            <View style={styles.keywordsContainer}>
              {faq.keywords.map((keyword) => (
                <View key={keyword} style={[styles.keywordBadge, keywordStyle]}>
                  <Text style={[styles.keywordText, keywordTextStyle]}>{keyword}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  question: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    flex: 1,
    paddingRight: 12,
  },
  chevron: {
    fontSize: 16,
    color: '#737373',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  answer: {
    fontSize: 14,
    color: '#525252',
    lineHeight: 20,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  keywordBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  keywordText: {
    fontSize: 12,
    color: '#737373',
  },
});
