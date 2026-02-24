/**
 * FAQ Item Component
 *
 * Displays a single FAQ with question, answer, and optional metadata.
 * Supports markdown in answers and expandable/collapsible behavior.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import DOMPurify from 'dompurify';

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

export function FAQItem({
  faq,
  className,
  expanded: controlledExpanded,
  defaultExpanded = false,
  onExpandedChange,
  showKeywords = false,
  dangerouslySetAnswerHTML = false,
}: FAQItemProps) {
  const [internalExpanded, setInternalExpanded] = React.useState(defaultExpanded);

  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    const newExpanded = !expanded;
    if (!isControlled) {
      setInternalExpanded(newExpanded);
    }
    onExpandedChange?.(newExpanded);
  };

  return (
    <div
      className={cn(
        'border border-neutral-200 rounded-lg overflow-hidden dark:border-neutral-800',
        className
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-left',
          'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800',
          'transition-colors duration-150'
        )}
        aria-expanded={expanded}
      >
        <span className="font-medium text-neutral-900 dark:text-neutral-100 pr-4">
          {faq.question}
        </span>
        <svg
          className={cn(
            'w-5 h-5 text-neutral-500 transition-transform duration-200 flex-shrink-0',
            expanded && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 py-3 bg-white dark:bg-neutral-950">
          {dangerouslySetAnswerHTML ? (
            <div
              className="text-sm text-neutral-600 dark:text-neutral-400 prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: (() => {
                  // UI-04: Force rel="noopener noreferrer" on all links
                  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
                    if (node.tagName === 'A') {
                      node.setAttribute('rel', 'noopener noreferrer');
                    }
                  });
                  const clean = DOMPurify.sanitize(faq.answer, {
                    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
                    ALLOWED_ATTR: ['href', 'target', 'rel'],
                  });
                  DOMPurify.removeAllHooks();
                  return clean;
                })(),
              }}
            />
          ) : (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
              {faq.answer}
            </p>
          )}

          {showKeywords && faq.keywords && faq.keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {faq.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="px-2 py-0.5 text-xs bg-neutral-100 text-neutral-600 rounded dark:bg-neutral-800 dark:text-neutral-400"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
