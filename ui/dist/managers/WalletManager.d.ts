import { PublicKey, Transaction } from '@solana/web3.js';
import { X402Requirement, PaymentPayload, SolanaCluster } from '../types';
/**
 * Options for building a Solana transaction
 */
export interface BuildTransactionOptions {
    requirement: X402Requirement;
    payerPublicKey: PublicKey;
    blockhash?: string;
}
/**
 * Options for building a payment payload
 */
export interface BuildPaymentPayloadOptions {
    requirement: X402Requirement;
    signedTx: {
        serialized: string;
        signature: string;
    };
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
    signTransaction(options: SignTransactionOptions): Promise<{
        serialized: string;
        signature: string;
    }>;
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
export declare class WalletManager implements IWalletManager {
    private connection;
    private readonly cluster;
    private readonly endpoint?;
    private readonly allowUnknownMint;
    private readonly rpcRateLimiter;
    private readonly rpcCircuitBreaker;
    constructor(cluster?: SolanaCluster, endpoint?: string, allowUnknownMint?: boolean);
    /**
     * Create Solana RPC connection
     */
    private createConnection;
    /**
     * Transform RPC errors into user-friendly messages
     */
    private transformRpcError;
    /**
     * Build transaction from x402 requirement
     */
    buildTransaction(options: BuildTransactionOptions): Promise<Transaction>;
    /**
     * Parse amount from x402 requirement (already in atomic units as string).
     * Uses BigInt to avoid truncation/overflow for large atomic values.
     */
    private resolveAmountInMinorUnits;
    /**
     * Build payment payload from signed transaction (x402 spec)
     */
    buildPaymentPayload(options: BuildPaymentPayloadOptions): PaymentPayload;
    /**
     * Sign transaction using wallet adapter (fully signed for regular mode)
     */
    signTransaction(options: SignTransactionOptions): Promise<{
        serialized: string;
        signature: string;
    }>;
    /**
     * Deserialize a base64-encoded transaction from the backend
     * Used for gasless flow where backend builds the complete transaction
     */
    deserializeTransaction(base64Transaction: string): Transaction;
    /**
     * Partially sign transaction for gasless mode
     * User signs their authority, server will co-sign as fee payer
     */
    partiallySignTransaction(options: PartiallySignTransactionOptions): Promise<string>;
    /**
     * Get wallet balance
     */
    getBalance(publicKey: PublicKey): Promise<number>;
    /**
     * Verify transaction on-chain
     */
    verifyTransaction(signature: string): Promise<boolean>;
}
//# sourceMappingURL=WalletManager.d.ts.map