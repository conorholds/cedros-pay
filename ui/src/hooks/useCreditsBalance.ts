import { useState, useEffect, useCallback, useRef } from 'react';
import { useCedrosContext } from '../context';

/** Credits balance state returned by the hook */
export interface CreditsBalanceState {
  /** Available balance in atomic units */
  available: number;
  /** Held (reserved) balance in atomic units */
  held: number;
  /** Currency/token symbol */
  currency: string;
  /** Whether balance is currently being fetched */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually refresh the balance */
  refresh: () => void;
}

/**
 * Hook that fetches and tracks the authenticated user's credits balance.
 *
 * @param authToken - JWT token from cedros-login. Balance is fetched when provided.
 * @returns Credits balance state including available, held, currency, and refresh function.
 *
 * @example
 * ```tsx
 * function BalanceDisplay({ authToken }: { authToken: string }) {
 *   const { available, currency, loading } = useCreditsBalance(authToken);
 *   if (loading) return <span>Loading…</span>;
 *   return <span>{available} {currency}</span>;
 * }
 * ```
 */
export function useCreditsBalance(authToken?: string): CreditsBalanceState {
  const { creditsManager } = useCedrosContext();
  const [state, setState] = useState<Omit<CreditsBalanceState, 'refresh'>>({
    available: 0,
    held: 0,
    currency: '',
    loading: false,
    error: null,
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!authToken) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await creditsManager.getBalance(authToken);
      if (!mountedRef.current) return;

      if (result) {
        setState({
          available: result.available,
          held: result.held,
          currency: result.currency,
          loading: false,
          error: null,
        });
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch balance',
      }));
    }
  }, [authToken, creditsManager]);

  // Fetch on mount and when authToken changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { ...state, refresh: fetchBalance };
}
