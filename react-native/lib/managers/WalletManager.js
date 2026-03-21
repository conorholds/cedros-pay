"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletManager = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const js_base64_1 = require("js-base64");
const bs58_1 = __importDefault(require("bs58"));
const errorHandling_1 = require("../utils/errorHandling");
const tokenMintValidator_1 = require("../utils/tokenMintValidator");
const logger_1 = require("../utils/logger");
const rateLimiter_1 = require("../utils/rateLimiter");
const circuitBreaker_1 = require("../utils/circuitBreaker");
const exponentialBackoff_1 = require("../utils/exponentialBackoff");
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
class WalletManager {
    constructor(cluster = 'mainnet-beta', endpoint, allowUnknownMint = false) {
        this.rpcRateLimiter = (0, rateLimiter_1.createRateLimiter)({
            maxRequests: 50,
            windowMs: 60000, // 50 requests per minute for RPC calls
        });
        this.rpcCircuitBreaker = (0, circuitBreaker_1.createCircuitBreaker)({
            failureThreshold: 5,
            timeout: 10000, // 10 seconds for faster recovery in payment flows
            name: 'solana-rpc',
        });
        this.cluster = cluster;
        this.endpoint = endpoint;
        this.allowUnknownMint = allowUnknownMint;
        this.connection = this.createConnection();
    }
    /**
     * Create Solana RPC connection
     */
    createConnection() {
        const endpoint = this.endpoint ?? (0, web3_js_1.clusterApiUrl)(this.cluster);
        return new web3_js_1.Connection(endpoint, 'confirmed');
    }
    /**
     * Transform RPC errors into user-friendly messages
     */
    transformRpcError(error) {
        const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : String(error));
        // Detect 403 Forbidden errors from public RPC
        if (errorMessage.includes('403') || errorMessage.includes('Access forbidden')) {
            return new Error('Public Solana RPC access denied. Please configure a custom RPC endpoint (e.g., from Helius, QuickNode, or Alchemy) in your CedrosProvider config using the solanaEndpoint option.');
        }
        // Detect rate limiting
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
            return new Error('Solana RPC rate limit exceeded. Please configure a custom RPC endpoint with higher limits in your CedrosProvider config using the solanaEndpoint option.');
        }
        // Pass through other errors
        return error instanceof Error ? error : new Error(errorMessage);
    }
    /**
     * Build transaction from x402 requirement
     */
    async buildTransaction(options) {
        const { requirement, payerPublicKey, blockhash } = options;
        if (!requirement || !requirement.payTo) {
            throw new Error('Invalid requirement: missing payTo');
        }
        (0, logger_1.getLogger)().debug('[WalletManager] Building transaction for resource:', requirement.resource);
        const transaction = new web3_js_1.Transaction();
        const amountInMinorUnits = this.resolveAmountInMinorUnits(requirement);
        // x402 spec uses asset field for token mint address
        const mintAddress = requirement.asset;
        if (!mintAddress) {
            throw new Error('asset is required in x402 requirement');
        }
        // Validate token mint against known stablecoins (STRICT by default)
        const assetValidation = (0, tokenMintValidator_1.validateX402Asset)(mintAddress, requirement.resource, this.allowUnknownMint);
        if (!assetValidation.isValid && assetValidation.error) {
            throw new Error(assetValidation.error);
        }
        if (assetValidation.warning) {
            (0, logger_1.getLogger)().warn(assetValidation.warning);
        }
        const mintPubkey = new web3_js_1.PublicKey(mintAddress);
        const payerTokenAccount = await (0, spl_token_1.getAssociatedTokenAddress)(mintPubkey, payerPublicKey);
        // Rate limiting check for RPC call
        if (!this.rpcRateLimiter.tryConsume()) {
            throw new Error('RPC rate limit exceeded. Please try again in a moment.');
        }
        let payerAccountInfo;
        try {
            payerAccountInfo = await this.rpcCircuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => await this.connection.getAccountInfo(payerTokenAccount), { ...exponentialBackoff_1.RETRY_PRESETS.QUICK, name: 'rpc-get-account-info' });
            });
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                throw new Error('Solana RPC service is temporarily unavailable. Please try again in a few moments.');
            }
            throw this.transformRpcError(error);
        }
        if (!payerAccountInfo) {
            throw new Error('Payer is missing an associated token account for this mint');
        }
        // Use recipientTokenAccount from extra if provided, otherwise derive from payTo
        let recipientTokenAccount;
        try {
            recipientTokenAccount = requirement.extra?.recipientTokenAccount
                ? new web3_js_1.PublicKey(requirement.extra.recipientTokenAccount)
                : new web3_js_1.PublicKey(requirement.payTo); // payTo should be the token account in x402
        }
        catch (error) {
            throw new Error('We are currently unable to process payment, please try again later');
        }
        // Backend is responsible for ensuring recipient account exists
        // Frontend just builds the transaction with the provided address
        transaction.add((0, spl_token_1.createTransferInstruction)(payerTokenAccount, recipientTokenAccount, payerPublicKey, amountInMinorUnits));
        // Add memo if provided
        if (requirement.extra?.memo) {
            const { TransactionInstruction } = await Promise.resolve().then(() => __importStar(require('@solana/web3.js')));
            const memoInstruction = new TransactionInstruction({
                keys: [],
                programId: new web3_js_1.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
                data: Buffer.from(requirement.extra.memo, 'utf8'),
            });
            transaction.add(memoInstruction);
        }
        // Get recent blockhash (use provided if gasless, otherwise fetch)
        let recentBlockhash;
        if (blockhash) {
            recentBlockhash = blockhash;
        }
        else {
            // Rate limiting check for RPC call
            if (!this.rpcRateLimiter.tryConsume()) {
                throw new Error('RPC rate limit exceeded. Please try again in a moment.');
            }
            try {
                const result = await this.rpcCircuitBreaker.execute(async () => {
                    return await (0, exponentialBackoff_1.retryWithBackoff)(async () => await this.connection.getLatestBlockhash(), { ...exponentialBackoff_1.RETRY_PRESETS.QUICK, name: 'rpc-get-blockhash' });
                });
                recentBlockhash = result.blockhash;
            }
            catch (error) {
                if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                    throw new Error('Solana RPC service is temporarily unavailable. Please try again in a few moments.');
                }
                throw this.transformRpcError(error);
            }
        }
        transaction.recentBlockhash = recentBlockhash;
        // Set fee payer (server wallet for gasless, user wallet for regular)
        if (requirement.extra?.feePayer) {
            transaction.feePayer = new web3_js_1.PublicKey(requirement.extra.feePayer);
        }
        else {
            transaction.feePayer = payerPublicKey;
        }
        return transaction;
    }
    /**
     * Parse amount from x402 requirement (already in atomic units as string)
     */
    resolveAmountInMinorUnits(requirement) {
        // x402 spec: maxAmountRequired is already in atomic units as a string
        const amount = parseInt(requirement.maxAmountRequired, 10);
        if (Number.isNaN(amount) || amount <= 0) {
            throw new Error('Invalid maxAmountRequired in requirement');
        }
        return amount;
    }
    /**
     * Build payment payload from signed transaction (x402 spec)
     */
    buildPaymentPayload(options) {
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
    async signTransaction(options) {
        const { transaction, signTransaction } = options;
        (0, logger_1.getLogger)().debug('[WalletManager] Requesting wallet to sign transaction');
        const signed = await signTransaction(transaction);
        const serialized = signed.serialize();
        const firstSignature = signed.signatures[0]?.signature;
        if (!firstSignature) {
            throw new Error('Signed transaction missing signature');
        }
        // Encode the 64-byte signature to base58
        // Note: Signatures are 64 bytes, not 32 like PublicKeys
        const signature = bs58_1.default.encode(new Uint8Array(firstSignature));
        (0, logger_1.getLogger)().debug('[WalletManager] Transaction signed with signature:', signature.substring(0, 20) + '...');
        return {
            serialized: js_base64_1.Base64.fromUint8Array(new Uint8Array(serialized)),
            signature,
        };
    }
    /**
     * Deserialize a base64-encoded transaction from the backend
     * Used for gasless flow where backend builds the complete transaction
     */
    deserializeTransaction(base64Transaction) {
        try {
            const txBytes = js_base64_1.Base64.toUint8Array(base64Transaction);
            return web3_js_1.Transaction.from(txBytes);
        }
        catch (error) {
            throw new Error(`Failed to deserialize transaction: ${(0, errorHandling_1.formatError)(error, 'Unknown error')}`);
        }
    }
    /**
     * Partially sign transaction for gasless mode
     * User signs their authority, server will co-sign as fee payer
     */
    async partiallySignTransaction(options) {
        const { transaction, signTransaction, blockhash } = options;
        // Preserve blockhash from backend if provided (avoids race conditions)
        if (blockhash && transaction.recentBlockhash !== blockhash) {
            transaction.recentBlockhash = blockhash;
        }
        const signed = await signTransaction(transaction);
        // Log the partial signature for debugging
        const firstSignature = signed.signatures[0]?.signature;
        if (firstSignature) {
            const sig = bs58_1.default.encode(new Uint8Array(firstSignature));
            (0, logger_1.getLogger)().debug('[WalletManager] Partially signed with signature:', sig.substring(0, 20) + '...');
        }
        // Serialize without requiring all signatures (server hasn't signed yet)
        const serialized = signed.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });
        return js_base64_1.Base64.fromUint8Array(new Uint8Array(serialized));
    }
    /**
     * Get wallet balance
     */
    async getBalance(publicKey) {
        // Rate limiting check for RPC call
        if (!this.rpcRateLimiter.tryConsume()) {
            throw new Error('RPC rate limit exceeded. Please try again in a moment.');
        }
        try {
            const balance = await this.rpcCircuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => await this.connection.getBalance(publicKey), { ...exponentialBackoff_1.RETRY_PRESETS.QUICK, name: 'rpc-get-balance' });
            });
            return balance / web3_js_1.LAMPORTS_PER_SOL;
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                throw new Error('Solana RPC service is temporarily unavailable. Please try again in a few moments.');
            }
            throw this.transformRpcError(error);
        }
    }
    /**
     * Verify transaction on-chain
     */
    async verifyTransaction(signature) {
        // Rate limiting check for RPC call
        if (!this.rpcRateLimiter.tryConsume()) {
            (0, logger_1.getLogger)().warn('[WalletManager] RPC rate limit exceeded for transaction verification');
            return false;
        }
        try {
            const status = await this.rpcCircuitBreaker.execute(async () => {
                return await (0, exponentialBackoff_1.retryWithBackoff)(async () => await this.connection.getSignatureStatus(signature), { ...exponentialBackoff_1.RETRY_PRESETS.QUICK, name: 'rpc-verify-tx' });
            });
            return !!status.value?.confirmationStatus;
        }
        catch (error) {
            if (error instanceof circuitBreaker_1.CircuitBreakerOpenError) {
                (0, logger_1.getLogger)().warn('[WalletManager] Circuit breaker OPEN - cannot verify transaction');
            }
            return false;
        }
    }
}
exports.WalletManager = WalletManager;
//# sourceMappingURL=WalletManager.js.map