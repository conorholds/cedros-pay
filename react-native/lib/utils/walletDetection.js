"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSolanaWallets = detectSolanaWallets;
exports.isMobileEnvironment = isMobileEnvironment;
exports.getPlatform = getPlatform;
exports.detectWalletAdapters = detectWalletAdapters;
const react_native_1 = require("react-native");
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
function detectSolanaWallets() {
    // Browser wallet extensions don't exist in React Native
    // Mobile wallets are handled via @solana-mobile/mobile-wallet-adapter-protocol
    return false;
}
/**
 * Check if we're running in a mobile environment
 * @returns true if React Native
 */
function isMobileEnvironment() {
    return react_native_1.Platform.OS === 'ios' || react_native_1.Platform.OS === 'android';
}
/**
 * Get the current platform
 * @returns 'ios' | 'android' | 'web' | 'windows' | 'macos'
 */
function getPlatform() {
    return react_native_1.Platform.OS;
}
/**
 * Detect wallet adapter capabilities
 * In React Native, always returns mobile environment info
 */
function detectWalletAdapters() {
    return {
        detected: false,
        environment: 'mobile',
        platform: getPlatform(),
        message: 'Mobile wallets use Solana Mobile Wallet Adapter protocol. Browser extensions are not available in React Native.',
    };
}
//# sourceMappingURL=walletDetection.js.map