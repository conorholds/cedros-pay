import { FAQItemData } from './FAQItem';
export interface FAQListProps {
    faqs: FAQItemData[];
    className?: string;
    /** Accordion mode - only one item expanded at a time */
    accordion?: boolean;
    /** Show keywords/tags on each item */
    showKeywords?: boolean;
    /** Render answers as HTML */
    dangerouslySetAnswerHTML?: boolean;
    /** Empty state message */
    emptyMessage?: string;
}
export declare function FAQList({ faqs, className, accordion, showKeywords, dangerouslySetAnswerHTML, emptyMessage, }: FAQListProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FAQList.d.ts.map