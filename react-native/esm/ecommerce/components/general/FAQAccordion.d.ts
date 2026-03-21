import * as React from 'react';
import { ViewStyle } from 'react-native';
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
export declare function FAQAccordion({ items, allowMultiple, style, }: FAQAccordionProps): React.JSX.Element;
//# sourceMappingURL=FAQAccordion.d.ts.map