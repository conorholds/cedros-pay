/**
 * FAQ List Component
 *
 * Displays a list of FAQs with optional accordion behavior.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import { FAQItem, type FAQItemData } from './FAQItem';

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

export function FAQList({
  faqs,
  className,
  accordion = false,
  showKeywords = false,
  dangerouslySetAnswerHTML = false,
  emptyMessage = 'No FAQs available.',
}: FAQListProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Filter to only active FAQs
  const activeFaqs = faqs.filter((faq) => faq.active !== false);

  if (activeFaqs.length === 0) {
    return (
      <div className={cn('text-center py-8 text-neutral-500 dark:text-neutral-400', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {activeFaqs.map((faq) => (
        <FAQItem
          key={faq.id}
          faq={faq}
          showKeywords={showKeywords}
          dangerouslySetAnswerHTML={dangerouslySetAnswerHTML}
          expanded={accordion ? expandedId === faq.id : undefined}
          onExpandedChange={
            accordion
              ? (expanded) => setExpandedId(expanded ? faq.id : null)
              : undefined
          }
        />
      ))}
    </div>
  );
}
