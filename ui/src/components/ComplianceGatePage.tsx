import { useEffect, useRef } from 'react';
import { useCedrosTheme } from '../context';
import { useComplianceCheck } from '../hooks/useComplianceCheck';

/**
 * Props for the ComplianceGatePage component.
 *
 * @example
 * ```tsx
 * <ComplianceGatePage
 *   resources={['product-1']}
 *   onCleared={() => stripeManager.processPayment(...)}
 *   onCancel={() => navigate('/shop')}
 * />
 * ```
 */
export interface ComplianceGatePageProps {
  /** Product/resource IDs to check compliance for */
  resources: string[];
  /** Called automatically when compliance passes */
  onCleared: () => void;
  /** Called when compliance is blocked, with the list of reasons */
  onBlocked?: (reasons: string[]) => void;
  /** Called when the user clicks "Go back" */
  onCancel?: () => void;
  /** Optional auth token (cedros-login JWT) for authenticated checks */
  authToken?: string;
  /** Custom content shown while checking */
  children?: React.ReactNode;
}

/**
 * Pre-checkout compliance gate page.
 *
 * Renders three states:
 * - **Checking:** spinner + "Verifying purchase eligibility..."
 * - **Cleared:** auto-fires `onCleared()` callback
 * - **Blocked:** card showing reasons + "Go back" button
 *
 * Uses `useCedrosTheme()` for styling. Works with `unstyled` mode.
 */
export function ComplianceGatePage({
  resources,
  onCleared,
  onBlocked,
  onCancel,
  authToken,
  children,
}: ComplianceGatePageProps) {
  const theme = useCedrosTheme();
  const { checkCompliance, loading, result, error } = useComplianceCheck();
  const hasChecked = useRef(false);

  // Run compliance check on mount (once)
  useEffect(() => {
    if (hasChecked.current || resources.length === 0) return;
    hasChecked.current = true;
    checkCompliance(resources, authToken);
  }, [resources, authToken, checkCompliance]);

  // Auto-fire callbacks when result arrives
  useEffect(() => {
    if (!result) return;
    if (result.cleared) {
      onCleared();
    } else if (result.reasons?.length) {
      onBlocked?.(result.reasons);
    }
  }, [result, onCleared, onBlocked]);

  const containerClass = theme.unstyled
    ? ''
    : `${theme.className} cedros-theme__compliance-gate`;
  const containerStyle = theme.unstyled ? {} : theme.style;

  // Checking state
  if (loading || !result) {
    return (
      <div className={containerClass} style={containerStyle}>
        {children ?? (
          <div className={theme.unstyled ? '' : 'cedros-theme__compliance-checking'}>
            <p>Verifying purchase eligibility...</p>
          </div>
        )}
      </div>
    );
  }

  // Cleared — the onCleared effect fires above; render nothing visible
  if (result.cleared) {
    return null;
  }

  // Blocked
  return (
    <div className={containerClass} style={containerStyle}>
      <div className={theme.unstyled ? '' : 'cedros-theme__compliance-blocked'}>
        <h3>Purchase Not Available</h3>
        <ul>
          {result.reasons?.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
        {error && <p className={theme.unstyled ? '' : 'cedros-theme__error'}>{error}</p>}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={theme.unstyled ? '' : 'cedros-theme__button'}
          >
            Go back
          </button>
        )}
      </div>
    </div>
  );
}
