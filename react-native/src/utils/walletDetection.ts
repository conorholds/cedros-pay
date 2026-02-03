import { Platform } from 'react-native';

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
export function detectSolanaWallets(): boolean {
  // Browser wallet extensions don't exist in React Native
  // Mobile wallets are handled via @solana-mobile/mobile-wallet-adapter-protocol
  return false;
}

/**
 * Check if we're running in a mobile environment
 * @returns true if React Native
 */
export function isMobileEnvironment(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * Get the current platform
 * @returns 'ios' | 'android' | 'web' | 'windows' | 'macos'
 */
export function getPlatform(): string {
  return Platform.OS;
}

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
export function detectWalletAdapters(): WalletAdapterDetectionResult {
  return {
    detected: false,
    environment: 'mobile',
    platform: getPlatform(),
    message: 'Mobile wallets use Solana Mobile Wallet Adapter protocol. Browser extensions are not available in React Native.',
  };
}
