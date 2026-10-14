import type {
  AutosaveConflictDialogProps,
  AutosaveRetryBannerProps,
  AutosaveStatusIndicatorProps,
  CedrosAutosaveState,
} from './types';

const STATUS_LABELS: Record<CedrosAutosaveState, string> = {
  idle: '',
  dirty: 'Unsaved changes',
  debouncing: 'Unsaved changes',
  queued: 'Unsaved changes',
  saving: 'Saving...',
  saved: 'Saved just now',
  retrying: 'Saving...',
  offline: 'Offline - changes will sync',
  conflict: 'Conflict - review changes',
  failed: 'Save failed - retry',
};

export function autosaveStatusLabel(status: CedrosAutosaveState): string {
  return STATUS_LABELS[status];
}

export function AutosaveStatusIndicator({
  className,
  status,
}: AutosaveStatusIndicatorProps) {
  if (status === 'idle') return null;
  return (
    <span
      className={className}
      role="status"
      aria-atomic="true"
      aria-live={liveModeForStatus(status)}
    >
      {autosaveStatusLabel(status)}
    </span>
  );
}

export function AutosaveRetryBanner({
  error,
  onRetry,
  status,
}: AutosaveRetryBannerProps) {
  if (status !== 'failed') return null;
  const message = error instanceof Error ? error.message : 'Your changes were not saved.';
  return (
    <div className="cedros-autosave-retry" role="alert">
      <span>{message}</span>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export function AutosaveConflictDialog({
  children,
  onDiscard,
  onReview,
  open,
  title = 'Conflict - review changes',
}: AutosaveConflictDialogProps) {
  if (!open) return null;
  return (
    <div
      className="cedros-autosave-conflict"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cedros-autosave-conflict-title"
    >
      <h2 id="cedros-autosave-conflict-title">{title}</h2>
      {children}
      <div>
        <button type="button" onClick={onReview}>
          Review changes
        </button>
        <button type="button" onClick={onDiscard}>
          Discard local changes
        </button>
      </div>
    </div>
  );
}

function liveModeForStatus(status: CedrosAutosaveState): 'off' | 'polite' {
  return status === 'debouncing' || status === 'dirty' ? 'off' : 'polite';
}
