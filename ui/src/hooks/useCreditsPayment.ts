import { useState, useCallback, useRef } from 'react';
import { useCedrosContext } from '../context';
import type { PaymentState, CreditsRequirement, CartCreditsQuote } from '../types';
import { normalizeCartItems } from '../utils/cartHelpers';
import { getLogger } from '../utils/logger';

/**
 * Extended state for credits payment including requirement
 */
interface CreditsPaymentState extends PaymentState {
  /** Credits requirement from quote (null if not fetched or unavailable) */
  requirement: CreditsRequirement | null;
  /** Current hold ID (if a hold is active) */
  holdId: string | null;
}

/**
 * Hook for Credits payment flow
 *
 * Handles:
 * - Fetching credits quotes
 * - Creating holds
 * - Authorizing payments
 * - Managing payment state
 *
 * @example
 * ```tsx
 * function CreditsPayment({ resource, amount }: { resource: string; amount: number }) {
 *   const { status, error, requirement, processPayment } = useCreditsPayment();
 *
 *   const handlePay = async () => {
 *     const result = await processPayment(resource, amount);
 *     if (result.success) {
 *       console.log('Payment successful:', result.transactionId);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handlePay} disabled={status === 'loading'}>
 *       {status === 'loading' ? 'Processing...' : `Pay ${amount} credits`}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCreditsPayment() {
  const { creditsManager } = useCedrosContext();
  const [state, setState] = useState<CreditsPaymentState>({
    status: 'idle',
    error: null,
    transactionId: null,
    requirement: null,
    holdId: null,
  });

  // Track in-flight payment requests to prevent concurrent submissions
  const isProcessingRef = useRef(false);

  /**
   * Fetch credits quote for a resource
   * Updates state.requirement with the quote if available
   */
  const fetchQuote = useCallback(
    async (resource: string, couponCode?: string) => {
      setState((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
      }));

      try {
        const requirement = await creditsManager.requestQuote(resource, couponCode);
        setState((prev) => ({
          ...prev,
          status: 'idle',
          requirement,
        }));
        return requirement;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch credits quote';
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));
        return null;
      }
    },
    [creditsManager]
  );

  /**
   * Fetch credits quote for a cart
   */
  const fetchCartQuote = useCallback(
    async (
      items: Array<{ resource: string; quantity?: number; variantId?: string }>,
      couponCode?: string
    ): Promise<{ cartId: string; credits: CartCreditsQuote } | null> => {
      setState((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
      }));

      try {
        const normalizedItems = normalizeCartItems(items);
        const result = await creditsManager.requestCartQuote(normalizedItems, couponCode);
        setState((prev) => ({
          ...prev,
          status: 'idle',
        }));
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch cart credits quote';
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: errorMessage,
        }));
        return null;
      }
    },
    [creditsManager]
  );

  /**
   * Process a complete credits payment
   * Creates hold and authorizes in one step
   * @param resource - Resource being purchased
   * @param authToken - JWT token from cedros-login for user authentication
   * @param couponCode - Optional coupon code for discount
   * @param metadata - Optional metadata
   */
  const processPayment = useCallback(
    async (
      resource: string,
      authToken: string,
      couponCode?: string,
      metadata?: Record<string, string>
    ) => {
      // Deduplication: prevent concurrent payment requests
      if (isProcessingRef.current) {
        return { success: false, error: 'Payment already in progress' };
      }

      isProcessingRef.current = true;

      setState({
        status: 'loading',
        error: null,
        transactionId: null,
        requirement: null,
        holdId: null,
      });

      try {
        const result = await creditsManager.processPayment(resource, authToken, couponCode, metadata);

        setState({
          status: result.success ? 'success' : 'error',
          error: result.success ? null : (result.error || 'Credits payment failed'),
          transactionId: result.success ? (result.transactionId || null) : null,
          requirement: null,
          holdId: null,
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Credits payment failed';
        setState({
          status: 'error',
          error: errorMessage,
          transactionId: null,
          requirement: null,
          holdId: null,
        });
        return { success: false, error: errorMessage };
      } finally {
        isProcessingRef.current = false;
      }
    },
    [creditsManager]
  );

  /**
   * Process a credits cart payment
   * Creates hold and authorizes cart in one step
   * @param items - Cart items to purchase
   * @param authToken - JWT token from cedros-login for user authentication
   * @param couponCode - Optional coupon code for discount
   * @param metadata - Optional metadata
   */
  const processCartPayment = useCallback(
    async (
      items: Array<{ resource: string; quantity?: number; variantId?: string }>,
      authToken: string,
      couponCode?: string,
      metadata?: Record<string, string>
    ) => {
      // Deduplication: prevent concurrent payment requests
      if (isProcessingRef.current) {
        return { success: false, error: 'Payment already in progress' };
      }

      isProcessingRef.current = true;

      setState({
        status: 'loading',
        error: null,
        transactionId: null,
        requirement: null,
        holdId: null,
      });

      let currentHoldId: string | null = null;

      try {
        // Step 1: Get cart quote
        const normalizedItems = normalizeCartItems(items);
        const cartQuote = await creditsManager.requestCartQuote(normalizedItems, couponCode);

        if (!cartQuote) {
          setState({
            status: 'error',
            error: 'Credits payment not available for this cart',
            transactionId: null,
            requirement: null,
            holdId: null,
          });
          return { success: false, error: 'Credits payment not available' };
        }

        // Step 2: Create hold on credits for this cart
        const hold = await creditsManager.createCartHold({
          cartId: cartQuote.cartId,
          authToken,
        });

        // Store holdId in local variable for cleanup in catch block
        currentHoldId = hold.holdId;

        setState((prev) => ({
          ...prev,
          holdId: currentHoldId,
        }));

        // Step 3: Authorize cart payment
        const result = await creditsManager.authorizeCartPayment({
          cartId: cartQuote.cartId,
          holdId: currentHoldId,
          authToken,
          metadata,
        });

        // Release hold if payment authorization was not successful
        if (!result.success && currentHoldId) {
          try {
            await creditsManager.releaseHold(currentHoldId, authToken);
          } catch (releaseErr) {
            getLogger().warn('[useCreditsPayment] Hold release failed, will expire server-side', {
              holdId: currentHoldId,
              error: releaseErr instanceof Error ? releaseErr.message : String(releaseErr),
            });
          }
        }

        setState({
          status: result.success ? 'success' : 'error',
          error: result.success ? null : (result.error || 'Cart credits payment failed'),
          transactionId: result.success ? (result.transactionId || null) : null,
          requirement: null,
          holdId: null,
        });

        return {
          success: result.success,
          transactionId: result.transactionId,
          error: result.error,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Cart credits payment failed';
        if (currentHoldId) {
          try {
            await creditsManager.releaseHold(currentHoldId, authToken);
          } catch (releaseErr) {
            // Do not mask the original checkout error.
            getLogger().warn('[useCreditsPayment] Hold release failed, will expire server-side', {
              holdId: currentHoldId,
              error: releaseErr instanceof Error ? releaseErr.message : String(releaseErr),
            });
          }
        }
        setState({
          status: 'error',
          error: errorMessage,
          transactionId: null,
          requirement: null,
          holdId: null,
        });
        return { success: false, error: errorMessage };
      } finally {
        isProcessingRef.current = false;
      }
    },
    [creditsManager]
  );

  /**
   * Reset payment state
   */
  const reset = useCallback(() => {
    setState({
      status: 'idle',
      error: null,
      transactionId: null,
      requirement: null,
      holdId: null,
    });
    isProcessingRef.current = false;
  }, []);

  return {
    ...state,
    fetchQuote,
    fetchCartQuote,
    processPayment,
    processCartPayment,
    reset,
  };
}
