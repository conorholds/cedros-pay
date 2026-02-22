import { PhantomWalletAdapter as n, SolflareWalletAdapter as i } from "@solana/wallet-adapter-wallets";
import { i as e } from "./CedrosContext-BnJ2Cf7R.mjs";
class r {
  adapters = null;
  poolId;
  isCleanedUp = !1;
  constructor(l) {
    this.poolId = l ?? `pool_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`, e().debug(`[WalletPool] Created pool: ${this.poolId}`);
  }
  /**
   * Get wallet adapters for this pool
   *
   * Lazy initialization: adapters are created on first access.
   * Returns empty array in SSR environments.
   */
  getAdapters() {
    return typeof window > "u" ? [] : this.isCleanedUp ? (e().warn(`[WalletPool] Attempted to use pool after cleanup: ${this.poolId}`), []) : this.adapters !== null ? this.adapters : (e().debug(`[WalletPool] Initializing adapters for pool: ${this.poolId}`), this.adapters = [
      new n(),
      new i()
    ], this.adapters);
  }
  /**
   * Cleanup wallet adapters
   *
   * Disconnects all wallets and clears the adapter cache.
   * Called automatically when CedrosProvider unmounts.
   *
   * IMPORTANT: After cleanup, getAdapters() will return empty array.
   */
  async cleanup() {
    if (this.isCleanedUp) {
      e().debug(`[WalletPool] Pool already cleaned up: ${this.poolId}`);
      return;
    }
    if (e().debug(`[WalletPool] Cleaning up pool: ${this.poolId}`), this.isCleanedUp = !0, this.adapters === null)
      return;
    const l = this.adapters.map(async (t) => {
      try {
        t.connected && (e().debug(`[WalletPool] Disconnecting wallet: ${t.name}`), await t.disconnect());
      } catch (a) {
        e().warn(`[WalletPool] Failed to disconnect wallet ${t.name}:`, a);
      }
    });
    await Promise.allSettled(l), this.adapters = null, e().debug(`[WalletPool] Pool cleanup complete: ${this.poolId}`);
  }
  /**
   * Check if this pool has been initialized
   *
   * Useful for testing or debugging.
   */
  isInitialized() {
    return this.adapters !== null;
  }
  /**
   * Get pool ID (for debugging/logging)
   */
  getId() {
    return this.poolId;
  }
}
function p(o) {
  return new r(o);
}
export {
  r as WalletPool,
  p as createWalletPool
};
