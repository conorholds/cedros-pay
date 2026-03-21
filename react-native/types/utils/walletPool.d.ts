/**
 * Context-Scoped Wallet Pool
 *
 * Provides isolated wallet adapter instances per CedrosProvider context.
 * Fixes multi-tenant isolation issues where User A's wallet could leak to User B
 * in multi-user dashboards or SSR scenarios.
 *
 * KEY DIFFERENCES FROM SINGLETON:
 * - Each CedrosProvider gets its own wallet pool
 * - Wallets are cleaned up when context unmounts
 * - No global state shared across contexts
 * - SSR-safe (no shared state between requests)
 * - Test-safe (each test gets isolated wallets)
 *
 * SECURITY:
 * - Prevents wallet address leakage between users
 * - Prevents signature request cross-contamination
 * - Ensures wallet connections are scoped to user sessions
 *
 * USAGE:
 * ```typescript
 * // In CedrosProvider
 * const walletPool = useRef(createWalletPool()).current;
 *
 * useEffect(() => {
 *   return () => walletPool.cleanup(); // Cleanup on unmount
 * }, []);
 *
 * const wallets = walletPool.getAdapters();
 * ```
 */
import type { WalletAdapter } from '@solana/wallet-adapter-base';
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