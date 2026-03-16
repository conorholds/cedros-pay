/**
 * Gift Card Balance Checker
 *
 * Lets users enter a gift card code and check the remaining balance.
 * Uses GET /paywall/v1/gift-card/balance/{code}.
 *
 * @example
 * ```tsx
 * <GiftCardBalanceChecker serverUrl="https://api.example.com" />
 * ```
 */

import { useState, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';

interface BalanceInfo {
  code: string;
  balance: number;
  currency: string;
  active: boolean;
  expiresAt?: string;
}

export interface GiftCardBalanceCheckerProps {
  /** Backend server URL (e.g., "https://api.example.com") */
  serverUrl: string;
  /** Additional CSS class for the container */
  className?: string;
}

function formatCurrency(cents: number, currency: string): string {
  const major = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

type ViewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'result'; data: BalanceInfo }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string };

export function GiftCardBalanceChecker({
  serverUrl,
  className,
}: GiftCardBalanceCheckerProps) {
  const [code, setCode] = useState('');
  const [state, setState] = useState<ViewState>({ kind: 'idle' });

  const handleCheck = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = code.trim();
      if (!trimmed) return;

      setState({ kind: 'loading' });
      try {
        const res = await fetch(
          `${serverUrl}/paywall/v1/gift-card/balance/${encodeURIComponent(trimmed)}`
        );
        if (res.status === 404) {
          setState({ kind: 'not-found' });
          return;
        }
        if (!res.ok) {
          const text = await res.text().catch(() => `HTTP ${res.status}`);
          setState({ kind: 'error', message: text });
          return;
        }
        const data: BalanceInfo = await res.json();
        setState({ kind: 'result', data });
      } catch (err) {
        setState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Network error',
        });
      }
    },
    [serverUrl, code]
  );

  return (
    <Card
      className={cn(
        'w-full max-w-md overflow-hidden rounded-2xl border-neutral-200/70 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950',
        className
      )}
    >
      <CardContent className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-neutral-950 dark:text-neutral-50">
          Check gift card balance
        </h2>

        <form onSubmit={(e) => void handleCheck(e)} className="space-y-3">
          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter gift card code"
            required
            className="font-mono tracking-wide uppercase"
          />
          <Button
            type="submit"
            className="w-full"
            disabled={state.kind === 'loading' || !code.trim()}
          >
            {state.kind === 'loading' ? 'Checking...' : 'Check balance'}
          </Button>
        </form>

        {state.kind === 'result' && <BalanceResult data={state.data} />}
        {state.kind === 'not-found' && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            No gift card found with that code. Please check the code and try again.
          </div>
        )}
        {state.kind === 'error' && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {state.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BalanceResult({ data }: { data: BalanceInfo }) {
  const expired = data.expiresAt && new Date(data.expiresAt) <= new Date();
  const usable = data.active && !expired && data.balance > 0;

  return (
    <div className="mt-4 space-y-3">
      <div
        className={cn(
          'rounded-xl border p-4 text-center',
          usable
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30'
            : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50'
        )}
      >
        <div className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Available balance
        </div>
        <div
          className={cn(
            'mt-1 text-3xl font-bold',
            usable
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-neutral-400 dark:text-neutral-600'
          )}
        >
          {formatCurrency(data.balance, data.currency)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-neutral-500 dark:text-neutral-400">Status</div>
        <div className="text-right">
          {!data.active ? (
            <span className="text-red-600 dark:text-red-400">Inactive</span>
          ) : expired ? (
            <span className="text-amber-600 dark:text-amber-400">Expired</span>
          ) : data.balance === 0 ? (
            <span className="text-neutral-500 dark:text-neutral-400">Fully used</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400">Active</span>
          )}
        </div>

        {data.expiresAt && (
          <>
            <div className="text-neutral-500 dark:text-neutral-400">Expires</div>
            <div
              className={cn(
                'text-right',
                expired
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-neutral-900 dark:text-neutral-100'
              )}
            >
              {formatDate(data.expiresAt)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
