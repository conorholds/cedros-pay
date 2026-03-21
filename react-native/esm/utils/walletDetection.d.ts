/**
 * Wallet detection for React Native
 *
 * In React Native, wallets work through the Mobile Wallet Adapter protocol
 * rather than browser extensions. This always returns false for extension detection
 * since browser wallets don't exist in mobile apps.
 */
/**
 * Detects if any Solana wallet is available on mobile
 * In React Native, this checks if the Mobile Wallet Adapter can connect
 * @returns false - Browser extensions don't exist in React Native
 */
export declare function detectSolanaWallets(): boolean;
/**
 * Check if we're running in a mobile environment
 * @returns true if React Native
 */
export declare function isMobileEnvironment(): boolean;
/**
 * Get the current platform
 * @returns 'ios' | 'android' | 'web' | 'windows' | 'macos'
 */
export declare function getPlatform(): string;
/**
 * Result of wallet adapter detection
 */
export interface WalletAdapterDetectionResult {
    detected: boolean;
    environment: 'mobile' | 'web' | 'unknown';
    platform: string;
    message: string;
}
/**
 * Detect wallet adapter capabilities
 * In React Native, always returns mobile environment info
 */
export declare function detectWalletAdapters(): WalletAdapterDetectionResult;
//# sourceMappingURL=walletDetection.d.ts.map