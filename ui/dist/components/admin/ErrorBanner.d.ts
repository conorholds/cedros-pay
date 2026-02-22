/**
 * Shared error banner with optional retry button.
 *
 * Renders nothing when `message` is null.
 */
export interface ErrorBannerProps {
    message: string | null;
    onRetry?: () => void;
}
export declare function ErrorBanner({ message, onRetry }: ErrorBannerProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=ErrorBanner.d.ts.map