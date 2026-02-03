import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCedrosContext } from '../context';
import type { PaymentState, X402Requirement, SettlementResponse } from '../types';
import { formatError } from '../utils/errorHandling';

/**
 * Hook for refund verification flow
 *
 * Handles:
 * - Fetching x402 refund quote
 * - Building and signing refund transaction
 * - Submitting refund payment proof
 * - Managing refund payment state
 *
 * @example
 * ```tsx
 * const { fetchRefundQuote, processRefund, state, requirement } = useRefundVerification();
 *
 * // 1. Fetch refund quote
 * const refundRequirement = await fetchRefundQuote('refund_x89201c3d5e7f9a2b4567890123456789');
 *
 * // 2. Process refund payment
 * await processRefund('refund_x89201c3d5e7f9a2b4567890123456789');
 * ```
 */
export function useRefundVerification() {
  const { x402Manager, walletManager } = useCedrosContext();
  const { publicKey, signTransaction } = useWallet();

  const [state, setState] = useState<PaymentState>({
    status: 'idle',
    error: null,
    transactionId: null,
  });

  const [requirement, setRequirement] = useState<X402Requirement | null>(null);
  const [settlement, setSettlement] = useState<SettlementResponse | null>(null);

  /**
   * Fetch x402 quote for a refund
   * @param refundId - Full refund ID including 'refund_' prefix (e.g., 'refund_x89201...')
   */
  const fetchRefundQuote = useCallback(
    async (refundId: string) => {
      try {
        setState((prev) => ({ ...prev, status: 'loading' }));
        const fetchedRequirement = await x402Manager.requestQuote({ resource: refundId });

        if (!x402Manager.validateRequirement(fetchedRequirement)) {
          throw new Error('Invalid refund requirement received from server');
        }

        setRequirement(fetchedRequirement);
        setState((prev) => ({ ...prev, status: 'idle' }));
        return fetchedRequirement;
      } catch (error) {
        const errorMessage = formatError(error, 'Failed to fetch refund requirement');
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
   * Process a refund payment (regular flow - wallet pays to receive refund)
   * @param refundId - Full refund ID including 'refund_' prefix
   * @param couponCode - Optional coupon code
   */
  const processRefund = useCallback(
    async (refundId: string, couponCode?: string) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      try {
        setState({
          status: 'loading',
          error: null,
          transactionId: null,
        });

        // Always fetch fresh quote (no stale requirements)
        const currentRequirement = await x402Manager.requestQuote({ resource: refundId, couponCode });

        if (!x402Manager.validateRequirement(currentRequirement)) {
          throw new Error('Invalid refund requirement received');
        }

        setRequirement(currentRequirement);

        // Build, sign, and submit transaction
        const transaction = await walletManager.buildTransaction({
          requirement: currentRequirement,
          payerPublicKey: publicKey,
        });

        const signedTx = await walletManager.signTransaction({
          transaction,
          signTransaction,
        });

        const paymentPayload = walletManager.buildPaymentPayload({
          requirement: currentRequirement,
          signedTx,
          payerPublicKey: publicKey,
        });

        // Submit with resourceType: 'refund'
        const result = await x402Manager.submitPayment({
          resource: refundId,
          payload: paymentPayload,
          couponCode,
          metadata: undefined, // no metadata for refunds
          resourceType: 'refund',
        });

        if (result.settlement) {
          setSettlement(result.settlement);
        }

        setState({
          status: 'success',
          error: null,
          transactionId: result.transactionId || signedTx.signature,
        });

        return result;
      } catch (error) {
        const errorMessage = formatError(error, 'Refund payment failed');
        setState({
          status: 'error',
          error: errorMessage,
          transactionId: null,
        });
        throw error;
      }
    },
    [publicKey, signTransaction, x402Manager, walletManager]
  );

  /**
   * Process a gasless refund payment (backend pays gas fees)
   * @param refundId - Full refund ID including 'refund_' prefix
   */
  const processGaslessRefund = useCallback(
    async (refundId: string) => {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      try {
        setState({
          status: 'loading',
          error: null,
          transactionId: null,
        });

        // Fetch fresh quote
        const currentRequirement = await x402Manager.requestQuote({ resource: refundId });

        if (!x402Manager.validateRequirement(currentRequirement)) {
          throw new Error('Invalid refund requirement received');
        }

        setRequirement(currentRequirement);

        // Request backend to build transaction (gasless flow)
        const { transaction: txBase64 } = await x402Manager.buildGaslessTransaction({
          resourceId: refundId,
          userWallet: publicKey.toString(),
          feePayer: currentRequirement.extra!.feePayer,
        });

        const transaction = walletManager.deserializeTransaction(txBase64);

        // User signs only as transfer authority (not fee payer)
        const partialTx = await walletManager.partiallySignTransaction({
          transaction,
          signTransaction,
        });

        // Submit with resourceType: 'refund'
        const result = await x402Manager.submitGaslessTransaction({
          resource: refundId,
          partialTx,
          couponCode: undefined, // no couponCode
          metadata: undefined, // no metadata
          resourceType: 'refund',
          requirement: currentRequirement,
        });

        if (result.settlement) {
          setSettlement(result.settlement);
        }

        setState({
          status: 'success',
          error: null,
          transactionId: result.transactionId || 'gasless-refund-tx',
        });

        return result;
      } catch (error) {
        const errorMessage = formatError(error, 'Gasless refund payment failed');
        setState({
          status: 'error',
          error: errorMessage,
          transactionId: null,
        });
        throw error;
      }
    },
    [publicKey, signTransaction, x402Manager, walletManager]
  );

  /**
   * Reset state to idle
   */
  const reset = useCallback(() => {
    setState({
      status: 'idle',
      error: null,
      transactionId: null,
    });
    setRequirement(null);
    setSettlement(null);
  }, []);

  return {
    state,
    requirement,
    settlement,
    fetchRefundQuote,
    processRefund,
    processGaslessRefund,
    reset,
  };
}
