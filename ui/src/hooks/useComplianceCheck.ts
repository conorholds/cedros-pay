import { useCallback, useState } from 'react';
import { useCedrosContext } from '../context';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { getLogger } from '../utils/logger';
import { parseErrorResponse } from '../utils/errorHandling';

/**
 * Result of a compliance pre-flight check.
 *
 * - `cleared: true` → the user may proceed to payment.
 * - `cleared: false` → blocked; `reasons` describes why.
 */
export interface ComplianceCheckResult {
  cleared: boolean;
  reasons?: string[];
}

/**
 * Hook for checking purchase compliance before Stripe checkout.
 *
 * Calls `POST /paywall/v1/compliance-check` with the given resource IDs
 * and returns the server's verdict (cleared / blocked with reasons).
 *
 * @example
 * ```tsx
 * const { checkCompliance, loading, result } = useComplianceCheck();
 * await checkCompliance(['product-1']);
 * if (result?.cleared) { // proceed }
 * ```
 */
export function useComplianceCheck() {
  const { config } = useCedrosContext();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplianceCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkCompliance = useCallback(
    async (resources: string[], authToken?: string): Promise<ComplianceCheckResult> => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const serverUrl = config.serverUrl || window.location.origin;
        const url = `${serverUrl}/paywall/v1/compliance-check`;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ resources }),
        });

        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response, 'Compliance check failed');
          throw new Error(errorMessage);
        }

        const data: ComplianceCheckResult = await response.json();
        setResult(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Compliance check failed';
        getLogger().error('[useComplianceCheck]', message);
        setError(message);
        // Fail open on network errors — the server-side gate in create_session
        // is the real security boundary.
        const fallback: ComplianceCheckResult = { cleared: true };
        setResult(fallback);
        return fallback;
      } finally {
        setLoading(false);
      }
    },
    [config.serverUrl],
  );

  return { checkCompliance, loading, result, error };
}
