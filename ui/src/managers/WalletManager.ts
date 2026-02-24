import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
} from '@solana/spl-token';
import { Base64 } from 'js-base64';
import bs58 from 'bs58';
import type { X402Requirement, PaymentPayload, SolanaCluster } from '../types';
import { formatError } from '../utils/errorHandling';
import { validateX402Asset } from '../utils/tokenMintValidator';
import { getLogger } from '../utils/logger';
import { createRateLimiter } from '../utils/rateLimiter';
import { createCircuitBreaker, CircuitBreakerOpenError } from '../utils/circuitBreaker';
import { retryWithBackoff, RETRY_PRESETS } from '../utils/exponentialBackoff';

/**
 * Options for building a Solana transaction
 */
export interface BuildTransactionOptions {
  requirement: X402Requirement;
  payerPublicKey: PublicKey;
  blockhash?: string;
  // Future extensibility: priorityFee, computeUnits, etc.
}

/**
 * Options for building a payment payload
 */
export interface BuildPaymentPayloadOptions {
  requirement: X402Requirement;
  signedTx: { serialized: string; signature: string };
  payerPublicKey: PublicKey;
}

/**
 * Options for signing a transaction
 */
export interface SignTransactionOptions {
  transaction: Transaction;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}

/**
 * Options for partially signing a transaction (gasless mode)
 */
export interface PartiallySignTransactionOptions {
  transaction: Transaction;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  blockhash?: string;
}

/**
 * Public interface for Solana wallet and transaction management.
 *
 * Use this interface for type annotations instead of the concrete WalletManager class.
 */
export interface IWalletManager {
  /**
   * Build a Solana transaction from x402 requirement
   */
  buildTransaction(options: BuildTransactionOptions): Promise<Transaction>;

  /**
   * Build payment payload from signed transaction
   */
  buildPaymentPayload(options: BuildPaymentPayloadOptions): PaymentPayload;

  /**
   * Sign transaction using wallet adapter (fully signed)
   */
  signTransaction(options: SignTransactionOptions): Promise<{ serialized: string; signature: string }>;

  /**
   * Deserialize a base64-encoded transaction
   */
  deserializeTransaction(base64Transaction: string): Transaction;

  /**
   * Partially sign transaction for gasless mode
   */
  partiallySignTransaction(options: PartiallySignTransactionOptions): Promise<string>;

  /**
   * Get wallet SOL balance
   */
  getBalance(publicKey: PublicKey): Promise<number>;

  /**
   * Verify transaction on-chain
   */
  verifyTransaction(signature: string): Promise<boolean>;
}

/**
 * Internal implementation of Solana wallet and transaction management.
 *
 * @internal
 * **DO NOT USE THIS CLASS DIRECTLY**
 *
 * This concrete class is not part of the stable API and may change without notice.
 *
 * **Correct Usage:**
 * ```typescript
 * import { useCedrosContext } from '@cedros/pay-react';
 *
 * function MyComponent() {
 *   const { walletManager } = useCedrosContext();
 *   await walletManager.buildTransaction({ ... });
 * }
 * ```
 *
 * @see {@link IWalletManager} for the stable interface
 * @see API_STABILITY.md for our API stability policy
 */
export class WalletManager implements IWalletManager {
  private connection: Connection;
  private readonly cluster: SolanaCluster;
  private readonly endpoint?: string;
  private readonly allowUnknownMint: boolean;
  private readonly rpcRateLimiter = createRateLimiter({
    maxRequests: 50,
    windowMs: 60000, // 50 requests per minute for RPC calls
  });
  private readonly rpcCircuitBreaker = createCircuitBreaker({
    failureThreshold: 5,
    timeout: 10000, // 10 seconds for faster recovery in payment flows
    name: 'solana-rpc',
  });

  constructor(
    cluster: SolanaCluster = 'mainnet-beta',
    endpoint?: string,
    allowUnknownMint: boolean = false
  ) {
    this.cluster = cluster;
    this.endpoint = endpoint;
    this.allowUnknownMint = allowUnknownMint;
    this.connection = this.createConnection();
  }

  /**
   * Create Solana RPC connection
   */
  private createConnection(): Connection {
    const endpoint = this.endpoint ?? clusterApiUrl(this.cluster);
    return new Connection(endpoint, 'confirmed');
  }

  /**
   * Transform RPC errors into user-friendly messages
   */
  private transformRpcError(error: unknown): Error {
    const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : String(error));

    // Detect 403 Forbidden errors from public RPC
    if (errorMessage.includes('403') || errorMessage.includes('Access forbidden')) {
      return new Error(
        'Public Solana RPC access denied. Please configure a custom RPC endpoint (e.g., from Helius, QuickNode, or Alchemy) in your CedrosProvider config using the solanaEndpoint option.'
      );
    }

    // Detect rate limiting
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      return new Error(
        'Solana RPC rate limit exceeded. Please configure a custom RPC endpoint with higher limits in your CedrosProvider config using the solanaEndpoint option.'
      );
    }

    // Pass through other errors
    return error instanceof Error ? error : new Error(errorMessage);
  }

  /**
   * Build transaction from x402 requirement
   */
  async buildTransaction(
    options: BuildTransactionOptions
  ): Promise<Transaction> {
    const { requirement, payerPublicKey, blockhash } = options;
    if (!requirement || !requirement.payTo) {
      throw new Error('Invalid requirement: missing payTo');
    }

    getLogger().debug('[WalletManager] Building transaction for resource:', requirement.resource);
    const transaction = new Transaction();
    const amountInMinorUnits = this.resolveAmountInMinorUnits(requirement);

    // x402 spec uses asset field for token mint address
    const mintAddress = requirement.asset;
    if (!mintAddress) {
      throw new Error('asset is required in x402 requirement');
    }

    // Validate token mint against known stablecoins (STRICT by default)
    const assetValidation = validateX402Asset(mintAddress, requirement.resource, this.allowUnknownMint);
    if (!assetValidation.isValid && assetValidation.error) {
      throw new Error(assetValidation.error);
    }
    if (assetValidation.warning) {
      getLogger().warn(assetValidation.warning);
    }

    const mintPubkey = new PublicKey(mintAddress);
    const payerTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      payerPublicKey
    );

    // Rate limiting check for RPC call
    if (!this.rpcRateLimiter.tryConsume()) {
      throw new Error('RPC rate limit exceeded. Please try again in a moment.');
    }

    let payerAccountInfo;
    try {
      payerAccountInfo = await this.rpcCircuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => await this.connection.getAccountInfo(payerTokenAccount),
          { ...RETRY_PRESETS.QUICK, name: 'rpc-get-account-info' }
        );
      });
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        throw new Error('Solana RPC service is temporarily unavailable. Please try again in a few moments.');
      }
      throw this.transformRpcError(error);
    }

    if (!payerAccountInfo) {
      throw new Error('Payer is missing an associated token account for this mint');
    }

    // Use recipientTokenAccount from extra if provided, otherwise derive from payTo
    let recipientTokenAccount: PublicKey;
    try {
      recipientTokenAccount = requirement.extra?.recipientTokenAccount
        ? new PublicKey(requirement.extra.recipientTokenAccount)
        : new PublicKey(requirement.payTo); // payTo should be the token account in x402
    } catch (error) {
      getLogger().warn('[WalletManager] Failed to resolve recipient address:', error);
      throw new Error('We are currently unable to process payment, please try again later');
    }

    // Backend is responsible for ensuring recipient account exists
    // Frontend just builds the transaction with the provided address
    transaction.add(
      createTransferInstruction(
        payerTokenAccount,
        recipientTokenAccount,
        payerPublicKey,
        amountInMinorUnits
      )
    );

    // Add memo if provided
    if (requirement.extra?.memo) {
      const memoInstruction = new TransactionInstruction({
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(requirement.extra.memo, 'utf8'),
      });
      transaction.add(memoInstruction);
    }

    // Get recent blockhash (use provided if gasless, otherwise fetch)
    let recentBlockhash;
    if (blockhash) {
      recentBlockhash = blockhash;
    } else {
      // Rate limiting check for RPC call
      if (!this.rpcRateLimiter.tryConsume()) {
        throw new Error('RPC rate limit exceeded. Please try again in a moment.');
      }

      try {
        const result = await this.rpcCircuitBreaker.execute(async () => {
          return await retryWithBackoff(
            async () => await this.connection.getLatestBlockhash(),
            { ...RETRY_PRESETS.QUICK, name: 'rpc-get-blockhash' }
          );
        });
        recentBlockhash = result.blockhash;
      } catch (error) {
        if (error instanceof CircuitBreakerOpenError) {
          throw new Error('Solana RPC service is temporarily unavailable. Please try again in a few moments.');
        }
        throw this.transformRpcError(error);
      }
    }

    transaction.recentBlockhash = recentBlockhash;

    // Set fee payer (server wallet for gasless, user wallet for regular)
    if (requirement.extra?.feePayer) {
      transaction.feePayer = new PublicKey(requirement.extra.feePayer);
    } else {
      transaction.feePayer = payerPublicKey;
    }

    return transaction;
  }

  /**
   * Parse amount from x402 requirement (already in atomic units as string).
   * Uses BigInt to avoid truncation/overflow for large atomic values.
   */
  private resolveAmountInMinorUnits(requirement: X402Requirement): bigint {
    const raw = requirement.maxAmountRequired;
    if (!/^\d+$/.test(raw)) {
      throw new Error('Invalid maxAmountRequired in requirement: must be a non-negative integer string');
    }
    const amount = BigInt(raw);
    if (amount <= 0n) {
      throw new Error('Invalid maxAmountRequired in requirement');
    }
    return amount;
  }

  /**
   * Build payment payload from signed transaction (x402 spec)
   */
  buildPaymentPayload(
    options: BuildPaymentPayloadOptions
  ): PaymentPayload {
    const { requirement, signedTx, payerPublicKey } = options;
    return {
      x402Version: 0,
      scheme: requirement.scheme,
      network: requirement.network,
      payload: {
        signature: signedTx.signature,
        transaction: signedTx.serialized,
        payer: payerPublicKey.toString(),
        memo: requirement.extra?.memo,
        recipientTokenAccount: requirement.extra?.recipientTokenAccount,
      },
    };
  }

  /**
   * Sign transaction using wallet adapter (fully signed for regular mode)
   */
  async signTransaction(
    options: SignTransactionOptions
  ): Promise<{ serialized: string; signature: string }> {
    const { transaction, signTransaction } = options;
    getLogger().debug('[WalletManager] Requesting wallet to sign transaction');
    const signed = await signTransaction(transaction);
    const serialized = signed.serialize();

    const firstSignature = signed.signatures[0]?.signature;
    if (!firstSignature) {
      throw new Error('Signed transaction missing signature');
    }

    // Encode the 64-byte signature to base58
    // Note: Signatures are 64 bytes, not 32 like PublicKeys
    const signature = bs58.encode(firstSignature);

    getLogger().debug('[WalletManager] Transaction signed with signature:', signature.substring(0, 20) + '...');

    return {
      serialized: Base64.fromUint8Array(serialized),
      signature,
    };
  }

  /**
   * Deserialize a base64-encoded transaction from the backend
   * Used for gasless flow where backend builds the complete transaction
   */
  deserializeTransaction(base64Transaction: string): Transaction {
    try {
      const txBytes = Base64.toUint8Array(base64Transaction);
      return Transaction.from(txBytes);
    } catch (error) {
      throw new Error(
        `Failed to deserialize transaction: ${formatError(error, 'Unknown error')}`
      );
    }
  }

  /**
   * Partially sign transaction for gasless mode
   * User signs their authority, server will co-sign as fee payer
   */
  async partiallySignTransaction(
    options: PartiallySignTransactionOptions
  ): Promise<string> {
    const { transaction, signTransaction, blockhash } = options;
    // Preserve blockhash from backend if provided (avoids race conditions)
    if (blockhash && transaction.recentBlockhash !== blockhash) {
      transaction.recentBlockhash = blockhash;
    }

    const signed = await signTransaction(transaction);

    // Log the partial signature for debugging
    const firstSignature = signed.signatures[0]?.signature;
    if (firstSignature) {
      const sig = bs58.encode(firstSignature);
      getLogger().debug('[WalletManager] Partially signed with signature:', sig.substring(0, 20) + '...');
    }

    // Serialize without requiring all signatures (server hasn't signed yet)
    const serialized = signed.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return Base64.fromUint8Array(serialized);
  }

  /**
   * Get wallet balance
   */
  async getBalance(publicKey: PublicKey): Promise<number> {
    // Rate limiting check for RPC call
    if (!this.rpcRateLimiter.tryConsume()) {
      throw new Error('RPC rate limit exceeded. Please try again in a moment.');
    }

    try {
      const balance = await this.rpcCircuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => await this.connection.getBalance(publicKey),
          { ...RETRY_PRESETS.QUICK, name: 'rpc-get-balance' }
        );
      });
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        throw new Error('Solana RPC service is temporarily unavailable. Please try again in a few moments.');
      }
      throw this.transformRpcError(error);
    }
  }

  /**
   * Verify transaction on-chain
   */
  async verifyTransaction(signature: string): Promise<boolean> {
    // Rate limiting check for RPC call
    if (!this.rpcRateLimiter.tryConsume()) {
      throw new Error('RPC rate limit exceeded for transaction verification');
    }

    try {
      const status = await this.rpcCircuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => await this.connection.getSignatureStatus(signature),
          { ...RETRY_PRESETS.QUICK, name: 'rpc-verify-tx' }
        );
      });
      return !!status.value?.confirmationStatus;
    } catch (error) {
      if (error instanceof CircuitBreakerOpenError) {
        getLogger().warn('[WalletManager] Circuit breaker OPEN - cannot verify transaction');
      }
      return false;
    }
  }
}
