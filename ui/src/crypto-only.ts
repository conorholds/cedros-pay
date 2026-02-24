/**
 * @cedros/pay-react/crypto-only
 *
 * Full entry point including Solana crypto payment components and hooks.
 * Use this when you need CryptoButton, useX402Payment, or other Solana features.
 *
 * Requires @solana/* peer dependencies to be installed.
 *
 * @example
 * ```typescript
 * import { CedrosProvider, CryptoButton, useX402Payment } from '@cedros/pay-react/crypto-only';
 * ```
 */

// Re-export everything from the default (Stripe-safe) entry
export * from './index';

// Crypto components (require @solana/* peer deps)
export { CryptoButton } from './components/CryptoButton';
export { CryptoSubscribeButton } from './components/CryptoSubscribeButton';

// Crypto hooks (require @solana/* peer deps)
export { useX402Payment } from './hooks/useX402Payment';
export { useCryptoSubscription } from './hooks/useCryptoSubscription';
export { useRefundVerification } from './hooks/useRefundVerification';

// Wallet manager (require @solana/* peer deps)
export type { IWalletManager } from './managers/WalletManager';

// Wallet pool (require @solana/wallet-adapter-wallets)
export { createWalletPool, WalletPool } from './utils/walletPool';

// Token validation
export { validateTokenMint, KNOWN_STABLECOINS } from './utils/tokenMintValidator';
