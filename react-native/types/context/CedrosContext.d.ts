import { type ReactNode } from 'react';
import type { CedrosConfig } from '../types';
import { type ISubscriptionManager } from '../managers/SubscriptionManager';
import { type ISubscriptionChangeManager } from '../managers/SubscriptionChangeManager';
import { type IStoreBillingManager } from '../managers/StoreBillingManager';
import { type WalletPool } from '../utils/walletPool';
/**
 * Context value containing configuration and manager instances.
 *
 * Managers are typed as interfaces to prevent direct instantiation
 * and allow for future implementation changes.
 */
export interface CedrosContextValue {
    config: CedrosConfig;
    subscriptionManager: ISubscriptionManager;
    subscriptionChangeManager: ISubscriptionChangeManager;
    storeBillingManager: IStoreBillingManager;
    /** Context-scoped wallet pool (for internal use by CedrosPay component) */
    walletPool: WalletPool;
    /** Cached Solana availability check result (null = not checked yet, string = error message, undefined = available) */
    solanaError: string | null | undefined;
}
/**
 * Props for CedrosProvider
 */
interface CedrosProviderProps {
    config: CedrosConfig;
    children: ReactNode;
}
/**
 * Provider component that initializes managers and provides config
 *
 * Usage:
 * <CedrosProvider config={{ stripePublicKey, serverUrl, solanaCluster }}>
 *   <App />
 * </CedrosProvider>
 */
export declare function CedrosProvider({ config, children }: CedrosProviderProps): import("react").JSX.Element;
/**
 * Hook to access Cedros context
 *
 * @throws Error if used outside CedrosProvider
 */
export declare function useCedrosContext(): CedrosContextValue;
export {};
//# sourceMappingURL=CedrosContext.d.ts.map