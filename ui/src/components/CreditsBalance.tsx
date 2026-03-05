import { useCedrosTheme } from '../context';
import { useCreditsBalance } from '../hooks/useCreditsBalance';

/** Props for the CreditsBalance component */
export interface CreditsBalanceProps {
  /** JWT token from cedros-login for user authentication */
  authToken?: string;
  /** Custom CSS class name */
  className?: string;
  /** Custom formatter for the balance display. Receives available amount and currency. */
  formatBalance?: (available: number, currency: string) => string;
  /** Whether to show the held/reserved amount */
  showHeld?: boolean;
}

/**
 * Displays the authenticated user's credits balance.
 *
 * Requires the user to be logged in via cedros-login.
 * Fetches balance on mount and provides a refresh button.
 *
 * @example
 * ```tsx
 * <CreditsBalance authToken={jwt} />
 * ```
 */
export function CreditsBalance({
  authToken,
  className = '',
  formatBalance,
  showHeld = false,
}: CreditsBalanceProps) {
  const theme = useCedrosTheme();
  const { available, held, currency, loading, error, refresh } = useCreditsBalance(authToken);

  const wrapperClassName = theme.unstyled
    ? className
    : `${theme.className} cedros-theme__credits-balance ${className}`.trim();

  if (!authToken) {
    return null;
  }

  const displayBalance = formatBalance
    ? formatBalance(available, currency)
    : `${available} ${currency}`;

  return (
    <div className={wrapperClassName} style={theme.unstyled ? {} : theme.style}>
      <div className={theme.unstyled ? '' : 'cedros-theme__credits-balance-amount'}>
        {loading ? 'Loading…' : displayBalance}
      </div>
      {showHeld && held > 0 && !loading && (
        <div className={theme.unstyled ? '' : 'cedros-theme__credits-balance-held'}>
          {held} {currency} held
        </div>
      )}
      {error && (
        <div className={theme.unstyled ? '' : 'cedros-theme__error'}>{error}</div>
      )}
      {!loading && (
        <button
          type="button"
          onClick={refresh}
          className={theme.unstyled ? '' : 'cedros-theme__credits-balance-refresh'}
          aria-label="Refresh balance"
        >
          ↻
        </button>
      )}
    </div>
  );
}
