/**
 * EmptyState
 *
 * Shared "no entries" view for admin tables and lists. Renders a centered
 * dashed card with a title, an optional helper line, and an optional action,
 * matching the host's empty-list pattern.
 */

import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  inTable?: boolean;
  variant?: 'block' | 'filtered' | 'micro';
}

export function EmptyState({
  title,
  description,
  action,
  inTable = false,
  variant = 'block',
}: EmptyStateProps) {
  if (variant !== 'block') {
    return (
      <div className={`cedros-data-empty-state cedros-data-empty ${inTable ? 'cedros-data-empty-state--in-table ' : ''}cedros-admin__empty cedros-admin__empty--${variant}`} role="status">
        <span>{description ?? title}</span>
        {action}
      </div>
    );
  }

  return (
    <div className={`cedros-data-empty-state cedros-data-empty ${inTable ? 'cedros-data-empty-state--in-table ' : ''}cedros-admin__empty cedros-admin__empty--block`}>
      <span className="cedros-data-empty-state__art" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <circle cx="17" cy="20" r="2" fill="currentColor" stroke="none" />
          <circle cx="17" cy="32" r="2" fill="currentColor" stroke="none" />
          <path d="M26 20h22M26 32h22" />
          <circle className="cedros-data-empty-state__art-accent" cx="17" cy="44" r="2" fill="currentColor" stroke="none" />
          <path className="cedros-data-empty-state__art-accent" strokeWidth="2.6" d="M26 44h13" />
        </svg>
      </span>
      <span className="cedros-admin__empty-title">{title}</span>
      {description ? (
        <span className="cedros-data-empty-state__copy cedros-admin__empty-text">
          {description}
        </span>
      ) : null}
      {action ? (
        <div className="cedros-data-empty-state__action cedros-admin__empty-action">
          {action}
        </div>
      ) : null}
    </div>
  );
}
