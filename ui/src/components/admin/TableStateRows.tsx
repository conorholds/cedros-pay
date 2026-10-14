import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

interface TableStateProps {
  columns: number;
}

export function TableLoadingRows({
  columns,
  label,
  rows = 3,
}: TableStateProps & { label: string; rows?: number }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr key={`loading-${rowIndex}`} className="cedros-admin__table-skeleton-row">
      {Array.from({ length: columns }, (_, columnIndex) => (
        <td key={columnIndex}>
          {rowIndex === 0 && columnIndex === 0 ? (
            <span className="cedros-admin__visually-hidden" role="status">{label}</span>
          ) : null}
          <span className="cedros-admin__table-skeleton-cell" aria-hidden="true" />
        </td>
      ))}
    </tr>
  ));
}

export function TableEmptyRow({
  action,
  columns,
  description,
  filtered = false,
  title,
}: TableStateProps & {
  action?: ReactNode;
  description: string;
  filtered?: boolean;
  title: string;
}) {
  return (
    <tr className="cedros-admin__table-state-row">
      <td colSpan={columns} className="cedros-admin__table-state-cell">
        <EmptyState
          action={action}
          description={description}
          inTable
          title={title}
          variant={filtered ? 'filtered' : 'block'}
        />
      </td>
    </tr>
  );
}

export function TableErrorRow({
  columns,
  message,
  onRetry,
}: TableStateProps & { message: string; onRetry: () => void }) {
  return (
    <tr className="cedros-admin__table-state-row">
      <td colSpan={columns} className="cedros-admin__table-state-cell">
        <div className="cedros-data-status cedros-data-status--error" role="alert">
          <span>{message}</span>
          <div className="cedros-data-status__actions">
            <button type="button" className="cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
