import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminApiError, AdminAuthManager } from '../components/admin/AdminAuthManager';
import { fetchAdminJson } from '../components/admin/authFetch';
import type { PaymentStats } from '../components/admin/types';
import type { PluginContext } from './types';

interface Snapshot {
  stats: PaymentStats;
  checkedAt: number;
}

type AccessError = 'unauthorized' | 'forbidden';

function hasPaymentTotals(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  // Older servers may omit optional order counts. A response still needs at
  // least one usable required total to qualify as a partial payment summary.
  return ['totalTransactions', 'pendingRefunds'].some((key) => {
    const total = (value as Record<string, unknown>)[key];
    return typeof total === 'number' && Number.isSafeInteger(total) && total >= 0;
  });
}

/** Pay owns this read; the host analytics props describe site traffic, not payments. */
export function useDashboardPaymentStats(context: PluginContext, refreshInterval: number) {
  const allowed = context.hasPermission('cedros-pay:admin') || context.hasPermission('admin');
  const enabled = allowed && context.serverUrl.length > 0;
  const token = context.getAccessToken();
  const { serverUrl, orgId, userId } = context;
  const source = useMemo(() => {
    const manager = new AdminAuthManager(serverUrl);
    manager.setCedrosLoginAuth(token, allowed);
    manager.setHostSessionAuth(allowed);
    return { manager, orgId, userId };
  }, [serverUrl, token, allowed, orgId, userId]);
  const [result, setResult] = useState<{
    source: typeof source;
    snapshot?: Snapshot;
    error?: boolean;
    accessError?: AccessError;
    loading: boolean;
  }>({ source, loading: true });
  const [retryKey, setRetryKey] = useState(0);
  const [staleSnapshot, setStaleSnapshot] = useState<Snapshot>();
  const retry = useCallback(() => setRetryKey((key) => key + 1), []);
  const interval = Number.isFinite(refreshInterval) && refreshInterval > 0
    ? Math.max(refreshInterval, 30_000)
    : 0;

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      let accessDenied = false;
      setResult((previous) => ({
        source,
        snapshot: previous.source === source ? previous.snapshot : undefined,
        error: previous.source === source ? previous.error : undefined,
        loading: true,
      }));
      try {
        const stats = await fetchAdminJson<PaymentStats>(source.manager, '/admin/stats', { signal: controller.signal });
        if (!hasPaymentTotals(stats)) {
          throw new Error('Invalid payment summary');
        }
        if (!disposed) setResult({ source, snapshot: { stats, checkedAt: Date.now() }, loading: false });
      } catch (error) {
        // Never expose a server error body (which can contain sensitive detail).
        const accessError = error instanceof AdminApiError
          ? error.status === 401 ? 'unauthorized' : error.status === 403 ? 'forbidden' : undefined
          : undefined;
        accessDenied = !!accessError;
        if (!disposed) setResult((previous) => ({
          ...previous,
          snapshot: accessError ? undefined : previous.snapshot,
          accessError,
          error: true,
          loading: false,
        }));
      } finally {
        // Recursive scheduling prevents overlap and treats the host interval as a floor.
        if (!disposed && !accessDenied && interval > 0) timer = setTimeout(() => void refresh(), interval);
      }
    };
    void refresh();
    return () => {
      disposed = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [enabled, source, interval, retryKey]);

  const current = enabled && result.source === source ? result : undefined;
  const snapshot = current?.snapshot;
  useEffect(() => {
    if (!snapshot) return;
    const remaining = snapshot.checkedAt + 2 * (interval || 30_000) - Date.now();
    const timer = setTimeout(() => setStaleSnapshot(snapshot), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [snapshot, interval]);

  return {
    allowed,
    enabled,
    snapshot,
    error: current?.error ?? false,
    accessError: current?.accessError,
    loading: enabled && (current?.loading ?? true),
    stale: !!snapshot && snapshot === staleSnapshot,
    retry,
  };
}
