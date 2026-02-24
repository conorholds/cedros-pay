/**
 * Shared error banner with optional retry button.
 *
 * Renders nothing when `message` is null.
 */

import { Icons } from './icons';

export interface ErrorBannerProps {
  message: string | null;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className="cedros-admin__error-banner">
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          className="cedros-admin__error-banner-retry"
          onClick={onRetry}
        >
          {Icons.refresh} Retry
        </button>
      )}
    </div>
  );
}
