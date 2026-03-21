/**
 * FAQ Item Component for React Native
 *
 * Displays a single FAQ with question, answer, and optional metadata.
 * Supports expandable/collapsible behavior.
 */
import * as React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
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
export declare function FAQItem({ faq, style, expanded: controlledExpanded, defaultExpanded, onExpandedChange, showKeywords, questionStyle, answerStyle, keywordStyle, keywordTextStyle, }: FAQItemProps): React.JSX.Element;
//# sourceMappingURL=FAQItem.d.ts.map