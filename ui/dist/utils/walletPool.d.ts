import { WalletAdapter } from '@solana/wallet-adapter-base';
/**
 * Wallet pool instance scoped to a specific React context
 *
 * Each instance maintains its own set of wallet adapters and handles cleanup.
 */
export declare class WalletPool {
    private adapters;
    private readonly poolId;
    private isCleanedUp;
    constructor(poolId?: string);
    /**
     * Get wallet adapters for this pool
     *
     * Lazy initialization: adapters are created on first access.
     * Returns empty array in SSR environments.
     */
    getAdapters(): WalletAdapter[];
    /**
     * Cleanup wallet adapters
     *
     * Disconnects all wallets and clears the adapter cache.
     * Called automatically when CedrosProvider unmounts.
     *
     * IMPORTANT: After cleanup, getAdapters() will return empty array.
     */
    cleanup(): Promise<void>;
    /**
     * Check if this pool has been initialized
     *
     * Useful for testing or debugging.
     */
    isInitialized(): boolean;
    /**
     * Get pool ID (for debugging/logging)
     */
    getId(): string;
}
/**
 * Create a new wallet pool instance
 *
 * Each CedrosProvider should create its own pool for isolation.
 *
 * @param poolId - Optional pool ID for debugging (auto-generated if not provided)
 * @returns New wallet pool instance
 *
 * @example
 * ```typescript
 * const walletPool = createWalletPool('user-123-session');
 * const wallets = walletPool.getAdapters();
 *
 * // Later, on component unmount:
 * await walletPool.cleanup();
 * ```
 */
export declare function createWalletPool(poolId?: string): WalletPool;
//# sourceMappingURL=walletPool.d.ts.map