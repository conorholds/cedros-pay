/**
 * useBackgroundRefresh
 *
 * Polls a refresh callback on a bounded recursive timer so admin data stays current without
 * a user-facing "Refresh"/"Retry" button. Two common modes:
 *  - lists/stats: pass { intervalMs } and leave `enabled` true to keep data
 *    fresh and silently recover from transient fetch errors.
 *  - config/load views: pass { enabled: hasError } to retry quietly in the
 *    background only while the last load failed.
 *
 * The latest callback is always invoked (kept in a ref) so callers can pass an
 * inline function without resetting the interval on every render.
 */

import { useEffect, useRef } from 'react';
import { ADMIN_DATA_INVALIDATED_EVENT } from './AdminDataEvents';

export interface BackgroundRefreshOptions {
  /** Poll interval in milliseconds. Defaults to 30s. Non-positive disables. */
  intervalMs?: number;
  /** When false, no polling is scheduled. Defaults to true. */
  enabled?: boolean;
}

export function useBackgroundRefresh(
  refresh: () => void | Promise<void>,
  { intervalMs = 30000, enabled = true }: BackgroundRefreshOptions = {}
): void {
  const savedRefresh = useRef(refresh);

  useEffect(() => {
    savedRefresh.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let running = false;
    let rerun = false;

    const canRefresh = () =>
      (typeof document === 'undefined' || document.visibilityState === 'visible')
      && (typeof navigator === 'undefined' || navigator.onLine !== false);
    const schedule = (delay: number) => {
      if (disposed) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void run(), jitter(delay));
    };
    const run = async () => {
      if (disposed) return;
      if (running) {
        rerun = true;
        return;
      }
      if (!canRefresh()) {
        schedule(intervalMs);
        return;
      }
      running = true;
      try {
        await savedRefresh.current();
        failures = 0;
      } catch {
        failures += 1;
      } finally {
        running = false;
        const delay = rerun ? 0 : Math.min(intervalMs * 2 ** failures, 300000);
        rerun = false;
        schedule(delay);
      }
    };
    const resume = () => {
      if (canRefresh()) schedule(0);
    };

    schedule(intervalMs);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', resume);
    if (typeof window !== 'undefined') window.addEventListener('online', resume);
    if (typeof window !== 'undefined') window.addEventListener(ADMIN_DATA_INVALIDATED_EVENT, resume);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', resume);
      if (typeof window !== 'undefined') window.removeEventListener('online', resume);
      if (typeof window !== 'undefined') window.removeEventListener(ADMIN_DATA_INVALIDATED_EVENT, resume);
    };
  }, [enabled, intervalMs]);
}

function jitter(delay: number): number {
  if (delay <= 0) return 0;
  return Math.max(1, Math.round(delay * (0.9 + Math.random() * 0.2)));
}
