/**
 * FAQ List Component for React Native
 *
 * Displays a list of FAQs with optional accordion behavior.
 */
import * as React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import { type FAQItemData } from './FAQItem';
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
export declare function FAQList({ faqs, style, accordion, showKeywords, emptyMessage, emptyMessageStyle, itemStyle, }: FAQListProps): React.JSX.Element;
//# sourceMappingURL=FAQList.d.ts.map