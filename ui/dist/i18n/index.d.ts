/**
 * Cedros Pay - Internationalization (i18n)
 *
 * Dynamic translation system that automatically loads languages
 * based on JSON files in the translations/ folder.
 *
 * Features:
 * - Zero-config language detection (uses browser locale)
 * - Dynamic loading (only loads the language you need)
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
 * Supported locales (dynamically determined by files in translations/ folder)
 * Locale codes follow BCP 47 standard (e.g., 'en', 'es', 'zh', 'ja', 'pt', 'fr')
 */
export type Locale = string;
/**
 * Get list of available locales by discovering translation files dynamically
 * Uses Vite's import.meta.glob to find all translation JSON files
 *
 * @returns Array of available locale codes
 */
export declare function getAvailableLocales(): Promise<Locale[]>;
/**
 * Detect user's preferred locale from browser
 *
 * @returns Detected locale code (e.g., 'en', 'es')
 */
export declare function detectLocale(): Locale;
/**
 * Load translations for a specific locale with fallback to English
 *
 * @param locale - Requested locale (e.g., 'es', 'zh')
 * @returns Translations object (always succeeds, falls back to English)
 */
export declare function loadLocale(locale: Locale): Promise<Translations>;
/**
 * Translation function type
 */
export type TranslateFn = (key: string, params?: Record<string, string>) => string;
/**
 * Create a translation function for a specific locale
 *
 * @param translations - Loaded translations object
 * @returns Translation function
 */
export declare function createTranslator(translations: Translations): TranslateFn;
/**
 * Get error message in current locale
 *
 * @param errorCode - Error code string (e.g., 'insufficient_funds_token')
 * @param translations - Current translations
 * @param includeAction - Whether to include action guidance
 * @returns Localized error message
 */
export declare function getLocalizedError(errorCode: string, translations: Translations, includeAction?: boolean): string;
//# sourceMappingURL=index.d.ts.map