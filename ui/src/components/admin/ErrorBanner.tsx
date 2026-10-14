/**
 * Shared inline error notice.
 *
 * Renders nothing when `message` is null. Callers may expose an explicit retry
 * when the failed operation is safe to repeat.
 *
 * Uses the Workbench error status contract so failures are announced and
 * visually consistent with host admin notices.
 */

export interface ErrorBannerProps {
  message: string | null;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className="cedros-data-status cedros-data-status--error cedros-admin__error-banner" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <div className="cedros-data-status__actions">
          <button type="button" className="cedros-data-btn cedros-data-btn--secondary cedros-data-btn--sm" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
