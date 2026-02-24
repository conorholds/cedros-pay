/**
 * AutosaveIndicator
 *
 * Shared status indicator for autosave operations.
 * Renders nothing when status is 'idle'.
 *
 * @param status - Current autosave state: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
 * @param error  - Optional error message shown when status is 'error'
 */

import { type AutosaveStatus } from './useAutosave';
import { Icons } from './icons';

export interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  error?: string | null;
}

export function AutosaveIndicator({ status, error }: AutosaveIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <span
      className={`cedros-admin__autosave-indicator cedros-admin__autosave-indicator--${status}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '0.8125rem',
        color: status === 'error' ? 'var(--cedros-admin-error, #ef4444)' : 'var(--cedros-admin-text-muted, #64748b)',
      }}
    >
      {status === 'pending' && (
        <span style={{ opacity: 0.7 }}>Unsaved changes</span>
      )}
      {status === 'saving' && (
        <>
          {Icons.loading}
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          {Icons.check}
          <span style={{ color: 'var(--cedros-admin-success, #22c55e)' }}>Saved</span>
        </>
      )}
      {status === 'error' && (
        <span>Save failed{error ? `: ${error}` : ''}</span>
      )}
    </span>
  );
}
