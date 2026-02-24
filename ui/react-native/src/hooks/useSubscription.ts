import { useState, useCallback } from 'react';
import { useCedrosContext } from '../context';
import type {
  SubscriptionState,
  SubscriptionSessionRequest,
  SubscriptionStatusRequest,
  SubscriptionStatusResponse,
  SubscriptionQuote,
  BillingInterval,
  PaymentResult,
} from '../types';
import type { SubscriptionQuoteOptions } from '../managers/SubscriptionManager';

/**
 * Hook for subscription management
 *
 * Handles:
 * - Creating Stripe subscription sessions and redirecting to checkout
 * - Checking subscription status (for x402 gating)
 * - Requesting subscription quotes (for x402 crypto payments)
 *
 * @example
 * ```tsx
 * function SubscribePage() {
 *   const { processSubscription, checkStatus, status, error } = useSubscription();
 *
 *   const handleSubscribe = async () => {
 *     await processSubscription({
 *       resource: 'plan-pro',
 *       interval: 'monthly',
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleSubscribe} disabled={status === 'loading'}>
 *       {status === 'loading' ? 'Processing...' : 'Subscribe'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSubscription() {
  const { subscriptionManager } = useCedrosContext();
  const [state, setState] = useState<SubscriptionState>({
    status: 'idle',
    error: null,
    sessionId: null,
    subscriptionStatus: null,
    expiresAt: null,
  });

  /**
   * Process a Stripe subscription: create session and redirect to checkout
   */
  const processSubscription = useCallback(
    async (request: SubscriptionSessionRequest): Promise<PaymentResult> => {
      setState((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
      }));

      const result = await subscriptionManager.processSubscription(request);

      setState((prev) => ({
        ...prev,
        status: result.success ? 'success' : 'error',
        error: result.success ? null : result.error || 'Subscription failed',
        sessionId: result.success ? result.transactionId || null : null,
      }));

      return result;
    },
    [subscriptionManager]
  );

  /**
   * Check subscription status for a user/resource (for x402 gating)
   */
  const checkStatus = useCallback(
    async (request: SubscriptionStatusRequest): Promise<SubscriptionStatusResponse> => {
      setState((prev) => ({
        ...prev,
        status: 'checking',
        error: null,
      }));

      try {
        const response = await subscriptionManager.checkSubscriptionStatus(request);

        setState((prev) => ({
          ...prev,
          status: response.active ? 'success' : 'idle',
          subscriptionStatus: response.status,
          expiresAt: response.expiresAt || response.currentPeriodEnd || null,
        }));

        return response;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to check subscription status';

        setState((prev) => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));

        throw error;
      }
    },
    [subscriptionManager]
  );

  /**
   * Request a subscription quote for x402 crypto payment
   */
  const requestQuote = useCallback(
    async (
      resource: string,
      interval: BillingInterval,
      options?: SubscriptionQuoteOptions
    ): Promise<SubscriptionQuote> => {
      setState((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
      }));

      try {
        const quote = await subscriptionManager.requestSubscriptionQuote(
          resource,
          interval,
          options
        );

        setState((prev) => ({
          ...prev,
          status: 'idle',
        }));

        return quote;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to get subscription quote';

        setState((prev) => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));

        throw error;
      }
    },
    [subscriptionManager]
  );

  /**
   * Reset the subscription state
   */
  const reset = useCallback(() => {
    setState({
      status: 'idle',
      error: null,
      sessionId: null,
      subscriptionStatus: null,
      expiresAt: null,
    });
  }, []);

  return {
    ...state,
    processSubscription,
    checkStatus,
    requestQuote,
    reset,
  };
}
