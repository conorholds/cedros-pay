import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useCedrosContext } from '../context';
import type { PaymentState, X402Requirement, SettlementResponse, PaymentResult } from '../types';
import { normalizeCartItems } from '../utils/cartHelpers';
import { formatError } from '../utils/errorHandling';

/**
 * Hook for x402 crypto payment flow
 *
 * Handles:
 * - Fetching x402 quote
 * - Building and signing transaction
 * - Submitting payment proof
 * - Managing payment state
 */
export function useX402Payment() {
  const { x402Manager, walletManager } = useCedrosContext();
  const { publicKey, signTransaction } = useWallet();

  const [state, setState] = useState<PaymentState>({
    status: 'idle',
    error: null,
    transactionId: null,
  });

  const [requirement, setRequirement] = useState<X402Requirement | null>(null);
  const [settlement, setSettlement] = useState<SettlementResponse | null>(null);

  // Track in-flight payment requests to prevent concurrent submissions
  const isProcessingRef = useRef(false);

  // PERFORMANCE OPTIMIZATION: Solana check is now done once at provider level
  // No need for redundant checks here - just use the cached result from context

  const validateWalletConnection = useCallback((): { valid: boolean; error?: string } => {
    if (!publicKey) {
      const error = 'Wallet not connected';
      setState({ status: 'error', error, transactionId: null });
      return { valid: false, error };
    }

    if (!signTransaction) {
      const error = 'Wallet does not support signing';
      setState({ status: 'error', error, transactionId: null });
      return { valid: false, error };
    }

    return { valid: true };
  }, [publicKey, signTransaction]);

  const fetchQuote = useCallback(
    async (resource: string) => {
      try {
        setState((prev) => ({ ...prev, status: 'loading' }));
        const fetchedRequirement = await x402Manager.requestQuote({ resource });

        if (!x402Manager.validateRequirement(fetchedRequirement)) {
          throw new Error('Invalid requirement received from server');
        }

        setRequirement(fetchedRequirement);
        setState((prev) => ({ ...prev, status: 'idle' }));
        return fetchedRequirement;
      } catch (error) {
        const errorMessage = formatError(error, 'Failed to fetch requirement');
        setState({
          status: 'error',
          error: errorMessage,
          transactionId: null,
        });
        throw error;
      }
    },
    [x402Manager]
  );

  /**
   * Internal helper: Process payment with a given requirement
   * Handles both gasless and regular transaction flows
   * Reduces code duplication between single and cart payments
   */
  const executePaymentFlow = useCallback(
    async (
      requirement: X402Requirement,
      resourceId: string,
      couponCode?: string,
      metadata?: Record<string, string>,
      resourceType: 'regular' | 'cart' | 'refund' = 'regular'
    ): Promise<PaymentResult> => {
      const isGasless = !!requirement.extra?.feePayer;

      if (isGasless) {
        console.log('⚡ [useX402Payment] GASLESS FLOW - Backend pays fees');
        // Gasless flow: Backend builds transaction with compute budget, then co-signs and submits
        console.log('🔨 [useX402Payment] Requesting backend to build gasless transaction');
        const { transaction: txBase64, blockhash } = await x402Manager.buildGaslessTransaction({
          resourceId,
          userWallet: (publicKey as PublicKey).toString(),
          feePayer: requirement.extra!.feePayer,
          couponCode,
        });

        console.log('📦 [useX402Payment] Deserializing transaction from backend');
        const transaction = walletManager.deserializeTransaction(txBase64);

        // User signs only as transfer authority (not fee payer)
        // Pass blockhash to preserve backend's time-sensitive value and avoid race conditions
        console.log('✍️ [useX402Payment] Requesting wallet to partially sign (transfer authority only)');
        const partialTx = await walletManager.partiallySignTransaction({
          transaction,
          signTransaction: signTransaction!,
          blockhash,
        });

        console.log('📤 [useX402Payment] Submitting partially-signed transaction to backend');
        const result = await x402Manager.submitGaslessTransaction({
          resource: resourceId,
          partialTx,
          couponCode,
          metadata,
          resourceType,
          requirement,
        });

        if (result.success && result.settlement) {
          setSettlement(result.settlement);
        }

        return result;
      } else {
        // Regular flow: user pays all fees
        const transaction = await walletManager.buildTransaction({
          requirement,
          payerPublicKey: publicKey as PublicKey,
        });

        const signedTx = await walletManager.signTransaction({
          transaction,
          signTransaction: signTransaction!,
        });

        const paymentPayload = walletManager.buildPaymentPayload({
          requirement,
          signedTx,
          payerPublicKey: publicKey as PublicKey,
        });

        const result = await x402Manager.submitPayment({
          resource: resourceId,
          payload: paymentPayload,
          couponCode,
          metadata,
          resourceType,
        });

        if (result.success && result.settlement) {
          setSettlement(result.settlement);
        }

        return result;
      }
    },
    [publicKey, signTransaction, x402Manager, walletManager]
  );

  const processPayment = useCallback(
    async (resource: string, couponCode?: string, metadata?: Record<string, string>) => {
      // Deduplication: prevent concurrent payment requests
      if (isProcessingRef.current) {
        return { success: false, error: 'Payment already in progress' };
      }

      const validation = validateWalletConnection();
      if (!validation.valid) {
        return { success: false, error: validation.error! };
      }

      isProcessingRef.current = true;

      setState({
        status: 'loading',
        error: null,
        transactionId: null,
      });

      try {
        // Always fetch fresh requirement to avoid stale pricing with different resources/coupons
        console.log('🔍 [useX402Payment] Fetching fresh quote for resource:', resource);
        const currentRequirement = await x402Manager.requestQuote({ resource, couponCode });
        console.log('✅ [useX402Payment] Got quote:', { payTo: currentRequirement.payTo, amount: currentRequirement.maxAmountRequired });
        setRequirement(currentRequirement);

        // Use shared payment flow
        console.log('⚙️ [useX402Payment] Executing payment flow with fresh requirement');
        const result = await executePaymentFlow(currentRequirement, resource, couponCode, metadata, 'regular');

        if (result.success) {
          setState({
            status: 'success',
            error: null,
            transactionId: result.transactionId || 'payment-success',
          });
        } else {
          setState({
            status: 'error',
            error: result.error || 'Payment failed',
            transactionId: null,
          });
        }

        return result;
      } catch (error) {
        const errorMessage = formatError(error, 'Payment failed');
        setState({
          status: 'error',
          error: errorMessage,
          transactionId: null,
        });
        return { success: false, error: errorMessage };
      } finally {
        isProcessingRef.current = false;
      }
    },
    [validateWalletConnection, x402Manager, executePaymentFlow]
  );

  const processCartPayment = useCallback(
    async (
      items: Array<{ resource: string; quantity?: number; variantId?: string }>,
      metadata?: Record<string, string>,
      couponCode?: string
    ) => {
      // Deduplication: prevent concurrent payment requests
      if (isProcessingRef.current) {
        return { success: false, error: 'Payment already in progress' };
      }

      const validation = validateWalletConnection();
      if (!validation.valid) {
        return { success: false, error: validation.error! };
      }

      isProcessingRef.current = true;

      setState({
        status: 'loading',
        error: null,
        transactionId: null,
      });

      try {
        // Normalize items before passing to manager
        const normalizedItems = normalizeCartItems(items);

        // Request cart quote from backend
        const cartQuote = await x402Manager.requestCartQuote({
          items: normalizedItems,
          metadata,
          couponCode,
        });
        const cartId = cartQuote.cartId;
        const requirement = cartQuote.quote;

        if (!x402Manager.validateRequirement(requirement)) {
          throw new Error('Invalid cart quote received from server');
        }

        setRequirement(requirement);

        // Use shared payment flow with cart ID
        const result = await executePaymentFlow(requirement, cartId, couponCode, metadata, 'cart');

        if (result.success) {
          setState({
            status: 'success',
            error: null,
            transactionId: result.transactionId || 'cart-payment-success',
          });
        } else {
          setState({
            status: 'error',
            error: result.error || 'Cart payment failed',
            transactionId: null,
          });
        }

        return result;
      } catch (error) {
        const errorMessage = formatError(error, 'Cart payment failed');
        setState({
          status: 'error',
          error: errorMessage,
          transactionId: null,
        });
        return { success: false, error: errorMessage };
      } finally {
        isProcessingRef.current = false;
      }
    },
    [validateWalletConnection, x402Manager, executePaymentFlow]
  );

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      error: null,
      transactionId: null,
    });
    setRequirement(null);
    setSettlement(null);
    isProcessingRef.current = false;
  }, []);

  return {
    ...state,
    requirement,
    settlement,
    fetchQuote,
    processPayment,
    processCartPayment,
    reset,
  };
}
