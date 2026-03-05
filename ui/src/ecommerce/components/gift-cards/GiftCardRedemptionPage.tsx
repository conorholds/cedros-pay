/**
 * Gift Card Redemption Page
 *
 * A landing page for recipients to claim a gift card via a redemption token.
 * Fetches gift card info from the server and allows authenticated users to claim credits.
 *
 * @example
 * ```tsx
 * // In your router (e.g., React Router)
 * <Route path="/gift-card/claim/:token" element={
 *   <GiftCardRedemptionPage
 *     serverUrl="https://api.example.com"
 *     token={params.token}
 *     authToken={user?.jwt}
 *     onSignIn={() => navigate('/login?redirect=/gift-card/claim/' + params.token)}
 *     onContinueShopping={() => navigate('/')}
 *   />
 * } />
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface GiftCardClaimInfo {
  faceValueCents: number;
  currency: string;
  claimed: boolean;
  recipientEmail?: string;
}

interface ClaimResult {
  success: boolean;
  creditsAdded: number;
  currency: string;
  newBalance: number;
}

export interface GiftCardRedemptionPageProps {
  /** Backend server URL (e.g., "https://api.example.com") */
  serverUrl: string;
  /** The redemption token from the URL */
  token: string;
  /** JWT auth token from cedros-login (required to claim) */
  authToken?: string;
  /** Called when unauthenticated user needs to sign in to claim */
  onSignIn?: () => void;
  /** Called when user clicks "Continue shopping" after claiming */
  onContinueShopping?: () => void;
  /** Additional CSS class for the page container */
  className?: string;
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'info'; data: GiftCardClaimInfo }
  | { kind: 'claiming' }
  | { kind: 'claimed'; result: ClaimResult }
  | { kind: 'already-claimed'; data: GiftCardClaimInfo };

function formatGiftCardValue(cents: number, currency: string): string {
  const major = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency}`;
  }
}

export function GiftCardRedemptionPage({
  serverUrl,
  token,
  authToken,
  onSignIn,
  onContinueShopping,
  className,
}: GiftCardRedemptionPageProps) {
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  const fetchInfo = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const res = await fetch(
        `${serverUrl}/paywall/v1/gift-card/claim/${encodeURIComponent(token)}`
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
      const data: GiftCardClaimInfo = await res.json();
      if (data.claimed) {
        setState({ kind: 'already-claimed', data });
      } else {
        setState({ kind: 'info', data });
      }
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'Network error' });
    }
  }, [serverUrl, token]);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  const handleClaim = useCallback(async () => {
    if (!authToken) return;
    setState({ kind: 'claiming' });
    try {
      const res = await fetch(
        `${serverUrl}/paywall/v1/gift-card/claim/${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => `HTTP ${res.status}`);
        setState({ kind: 'error', message: text });
        return;
      }
      const result: ClaimResult = await res.json();
      setState({ kind: 'claimed', result });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'Network error' });
    }
  }, [serverUrl, token, authToken]);

  return (
    <div className={cn('flex min-h-[50vh] items-center justify-center p-4', className)}>
      <Card className="w-full max-w-md overflow-hidden rounded-2xl border-neutral-200/70 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <CardContent className="p-8">
          {state.kind === 'loading' ? (
            <LoadingView />
          ) : state.kind === 'not-found' ? (
            <NotFoundView />
          ) : state.kind === 'error' ? (
            <ErrorView message={state.message} onRetry={fetchInfo} />
          ) : state.kind === 'already-claimed' ? (
            <AlreadyClaimedView data={state.data} onContinueShopping={onContinueShopping} />
          ) : state.kind === 'info' ? (
            <ClaimableView
              data={state.data}
              isAuthenticated={!!authToken}
              onClaim={handleClaim}
              onSignIn={onSignIn}
            />
          ) : state.kind === 'claiming' ? (
            <ClaimingView />
          ) : (
            <SuccessView result={state.result} onContinueShopping={onContinueShopping} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="text-center text-neutral-600 dark:text-neutral-400">
      Loading gift card details...
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
        Gift card not found
      </h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        This gift card link is invalid or has expired. Please check the link and try again.
      </p>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
      <div className="mt-4">
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  );
}

function AlreadyClaimedView({
  data,
  onContinueShopping,
}: {
  data: GiftCardClaimInfo;
  onContinueShopping?: () => void;
}) {
  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
        Already claimed
      </h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        This {formatGiftCardValue(data.faceValueCents, data.currency)} gift card has already been
        redeemed. The credits are in your account.
      </p>
      {onContinueShopping ? (
        <div className="mt-6">
          <Button type="button" onClick={onContinueShopping}>
            Continue shopping
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ClaimableView({
  data,
  isAuthenticated,
  onClaim,
  onSignIn,
}: {
  data: GiftCardClaimInfo;
  isAuthenticated: boolean;
  onClaim: () => void;
  onSignIn?: () => void;
}) {
  const value = formatGiftCardValue(data.faceValueCents, data.currency);

  return (
    <div className="text-center">
      <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Gift card</div>
      <div className="mt-2 text-4xl font-bold text-neutral-950 dark:text-neutral-50">{value}</div>
      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
        {data.recipientEmail
          ? `A gift card for ${data.recipientEmail} is ready to claim.`
          : 'You have a gift card ready to claim.'}
      </p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
        Credits will be added to your account and can be used for purchases.
      </p>
      <div className="mt-6">
        {isAuthenticated ? (
          <Button type="button" onClick={onClaim} className="w-full">
            Claim {value} credits
          </Button>
        ) : (
          <>
            <Button type="button" onClick={onSignIn} className="w-full">
              Sign in to claim
            </Button>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
              You need to sign in or create an account to receive your credits.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ClaimingView() {
  return (
    <div className="text-center text-neutral-600 dark:text-neutral-400">
      Claiming your gift card...
    </div>
  );
}

function SuccessView({
  result,
  onContinueShopping,
}: {
  result: ClaimResult;
  onContinueShopping?: () => void;
}) {
  const added = formatGiftCardValue(result.creditsAdded, result.currency);
  const balance = formatGiftCardValue(result.newBalance, result.currency);

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
        Gift card claimed
      </h2>
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          {added} credits added
        </div>
        <div className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-200/80">
          Your new balance is {balance}
        </div>
      </div>
      {onContinueShopping ? (
        <div className="mt-6">
          <Button type="button" onClick={onContinueShopping}>
            Start shopping
          </Button>
        </div>
      ) : null}
    </div>
  );
}
