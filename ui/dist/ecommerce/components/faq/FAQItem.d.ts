/**
 * FAQ Item Component
 *
 * Displays a single FAQ with question, answer, and optional metadata.
 * Supports markdown in answers and expandable/collapsible behavior.
 */
export interface FAQItemData {
    id: string;
    question: string;
    answer: string;
    keywords?: string[];
    active?: boolean;
}
export interface FAQItemProps {
    faq: FAQItemData;
    className?: string;
    /** Whether the item is expanded (controlled) */
    expanded?: boolean;
    /** Default expanded state (uncontrolled) */
    defaultExpanded?: boolean;
    /** Callback when expanded state changes */
    onExpandedChange?: (expanded: boolean) => void;
    /** Show keywords/tags */
    showKeywords?: boolean;
    /** Render answer as HTML (for markdown-rendered content) */
    dangerouslySetAnswerHTML?: boolean;
}
export declare function FAQItem({ faq, className, expanded: controlledExpanded, defaultExpanded, onExpandedChange, showKeywords, dangerouslySetAnswerHTML, }: FAQItemProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=FAQItem.d.ts.map