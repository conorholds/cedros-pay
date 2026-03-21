/**
 * Cedros Pay - Internationalization (i18n)
 *
 * Static translation system compatible with Metro bundler.
 * All translations are statically required so Metro can resolve them at build time.
 *
 * Features:
 * - Zero-config language detection (uses device locale)
 * - Static requires (Metro-compatible, no dynamic import())
 * - Automatic fallback to English
 * - Type-safe translation keys
 * - Manual locale override via CedrosProvider
 */
/**
 * Translation structure matching translations/*.json files
 */
export interface Translations {
    locale: string;
    ui: {
        pay_with_card: string;
        pay_with_crypto: string;
        pay_with_usdc: string;
        purchase: string;
        card: string;
        usdc_solana: string;
        crypto: string;
        connect_wallet: string;
        connecting: string;
        processing: string;
        loading: string;
        close: string;
        cancel: string;
        confirm: string;
        retry: string;
        go_back: string;
        contact_support: string;
        disconnect: string;
        payment_successful: string;
        subscribe: string;
        subscribe_with_crypto: string;
        subscribed: string;
        subscribed_until: string;
        subscription_active: string;
        redirecting_to_checkout: string;
    };
    errors: {
        [errorCode: string]: {
            message: string;
            action?: string;
        };
    };
    validation: {
        unknown_token_mint: string;
        token_typo_warning: string;
    };
    wallet: {
        no_wallet_detected: string;
        install_wallet: string;
        wallet_not_connected: string;
        connect_your_wallet: string;
        wallet_connection_failed: string;
        try_again: string;
        transaction_rejected: string;
        approve_in_wallet: string;
        select_wallet: string;
        change: string;
    };
}
/**
 * Supported locales
 */
export type Locale = string;
/**
 * Get list of available locales
 */
export declare function getAvailableLocales(): Promise<Locale[]>;
/**
 * Detect user's preferred locale from device-provided locale
 *
 * @param deviceLocale - Optional device locale string (e.g., 'en-US', 'es-ES').
 *                       Should be provided by react-native-localize in React Native.
 * @returns Detected locale code (e.g., 'en', 'es')
 */
export declare function detectLocale(deviceLocale?: string): Locale;
/**
 * Load translations for a specific locale with fallback to English.
 * Now synchronous internally but keeps async signature for API compat.
 */
export declare function loadLocale(locale: Locale): Promise<Translations>;
/**
 * Translation function type
 */
export type TranslateFn = (key: string, params?: Record<string, string>) => string;
/**
 * Create a translation function for a specific locale
 */
export declare function createTranslator(translations: Translations): TranslateFn;
/**
 * Get error message in current locale
 */
export declare function getLocalizedError(errorCode: string, translations: Translations, includeAction?: boolean): string;
//# sourceMappingURL=index.d.ts.map