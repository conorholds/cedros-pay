import { type ReactNode } from 'react';
import type { CedrosConfig } from '../types';
import { type IStripeManager } from '../managers/StripeManager';
import { type IX402Manager } from '../managers/X402Manager';
import { type IWalletManager } from '../managers/WalletManager';
import { type ISubscriptionManager } from '../managers/SubscriptionManager';
import { type ISubscriptionChangeManager } from '../managers/SubscriptionChangeManager';
import { type ICreditsManager } from '../managers/CreditsManager';
import { type WalletPool } from '../utils/walletPool';
/**
 * Context value containing configuration and manager instances.
 *
 * Managers are typed as interfaces to prevent direct instantiation
 * and allow for future implementation changes.
 */
export interface CedrosContextValue {
    config: CedrosConfig;
    stripeManager: IStripeManager;
    x402Manager: IX402Manager;
    walletManager: IWalletManager;
    subscriptionManager: ISubscriptionManager;
    subscriptionChangeManager: ISubscriptionChangeManager;
    creditsManager: ICreditsManager;
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