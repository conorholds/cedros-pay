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

import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import type { WalletAdapter } from '@solana/wallet-adapter-base';
import { getLogger } from './logger';

/**
 * Wallet pool instance scoped to a specific React context
 *
 * Each instance maintains its own set of wallet adapters and handles cleanup.
 */
export class WalletPool {
  private adapters: WalletAdapter[] | null = null;
  private readonly poolId: string;
  private isCleanedUp = false;

  constructor(poolId?: string) {
    this.poolId = poolId ?? `pool_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    getLogger().debug(`[WalletPool] Created pool: ${this.poolId}`);
  }

  /**
   * Get wallet adapters for this pool
   *
   * Lazy initialization: adapters are created on first access.
   * Returns empty array in SSR environments.
   */
  getAdapters(): WalletAdapter[] {
    // SSR safety: return empty array if window is undefined
    if (typeof window === 'undefined') {
      return [];
    }

    // Prevent use after cleanup
    if (this.isCleanedUp) {
      getLogger().warn(`[WalletPool] Attempted to use pool after cleanup: ${this.poolId}`);
      return [];
    }

    // Return cached instances if already initialized
    if (this.adapters !== null) {
      return this.adapters;
    }

    // Lazy initialization: create instances on first access
    getLogger().debug(`[WalletPool] Initializing adapters for pool: ${this.poolId}`);
    this.adapters = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ];

    return this.adapters;
  }

  /**
   * Cleanup wallet adapters
   *
   * Disconnects all wallets and clears the adapter cache.
   * Called automatically when CedrosProvider unmounts.
   *
   * IMPORTANT: After cleanup, getAdapters() will return empty array.
   */
  async cleanup(): Promise<void> {
    if (this.isCleanedUp) {
      getLogger().debug(`[WalletPool] Pool already cleaned up: ${this.poolId}`);
      return;
    }

    getLogger().debug(`[WalletPool] Cleaning up pool: ${this.poolId}`);
    this.isCleanedUp = true;

    if (this.adapters === null) {
      // Never initialized, nothing to clean up
      return;
    }

    // Disconnect all wallets
    const disconnectPromises = this.adapters.map(async (adapter) => {
      try {
        // Only disconnect if wallet is connected
        if (adapter.connected) {
          getLogger().debug(`[WalletPool] Disconnecting wallet: ${adapter.name}`);
          await adapter.disconnect();
        }
      } catch (error) {
        // Don't throw on cleanup errors, just log them
        getLogger().warn(`[WalletPool] Failed to disconnect wallet ${adapter.name}:`, error);
      }
    });

    await Promise.allSettled(disconnectPromises);

    // Clear adapter references
    this.adapters = null;
    getLogger().debug(`[WalletPool] Pool cleanup complete: ${this.poolId}`);
  }

  /**
   * Check if this pool has been initialized
   *
   * Useful for testing or debugging.
   */
  isInitialized(): boolean {
    return this.adapters !== null;
  }

  /**
   * Get pool ID (for debugging/logging)
   */
  getId(): string {
    return this.poolId;
  }
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
export function createWalletPool(poolId?: string): WalletPool {
  return new WalletPool(poolId);
}
