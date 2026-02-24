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

import { getUserFriendlyError } from '../utils/errorMessages';

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
    // Subscription UI strings
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
 * Translation cache to avoid re-importing
 */
const translationCache: Map<Locale, Translations> = new Map();

/**
 * Available locales (populated dynamically)
 */
let availableLocales: Locale[] | null = null;

/**
 * Dynamically import a translation file
 *
 * @param locale - Locale code (e.g., 'en', 'es', 'zh')
 * @returns Translation object or null if not found
 */
async function loadTranslation(locale: Locale): Promise<Translations | null> {
  // Check cache first
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!;
  }

  try {
    // Dynamic import based on locale
    // Vite will bundle all JSON files in translations/ folder
    const translation = await import(`./translations/${locale}.json`);
    const data: Translations = translation.default || translation;

    // Cache it
    translationCache.set(locale, data);
    return data;
  } catch (error) {
    // Translation file doesn't exist
    return null;
  }
}

/**
 * Get list of available locales by discovering translation files dynamically
 * Uses Vite's import.meta.glob to find all translation JSON files
 *
 * @returns Array of available locale codes
 */
export async function getAvailableLocales(): Promise<Locale[]> {
  if (availableLocales) {
    return availableLocales;
  }

  // Dynamically discover all translation files using Vite's glob import
  // This will include all JSON files in the translations/ directory
  const translationModules = import.meta.glob('./translations/*.json');

  // Extract locale codes from file paths
  const available: Locale[] = [];
  for (const path in translationModules) {
    // Extract locale from path like "./translations/en.json" -> "en" or "./translations/fil.json" -> "fil"
    // Supports 2-letter codes (en, es), 3-letter codes (fil), and region codes (en-US)
    const match = path.match(/\.\/translations\/([a-z]{2,3}(?:-[A-Z]{2})?)\.json$/);
    if (match) {
      available.push(match[1]);
    }
  }

  availableLocales = available.length > 0 ? available : ['en']; // Fallback to English
  return availableLocales;
}

/**
 * Detect user's preferred locale from browser
 *
 * @returns Detected locale code (e.g., 'en', 'es')
 */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return 'en'; // SSR fallback
  }

  // Get browser language (e.g., "en-US", "es-ES", "zh-CN")
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en';

  // Extract base language code (e.g., "en-US" -> "en")
  const baseLocale = browserLang.split('-')[0].toLowerCase();

  return baseLocale;
}

/**
 * Load translations for a specific locale with fallback to English
 *
 * @param locale - Requested locale (e.g., 'es', 'zh')
 * @returns Translations object (always succeeds, falls back to English)
 */
export async function loadLocale(locale: Locale): Promise<Translations> {
  // Try requested locale
  let translation = await loadTranslation(locale);
  if (translation) {
    return translation;
  }

  // Fallback to English
  translation = await loadTranslation('en');
  if (translation) {
    return translation;
  }

  // Ultimate fallback (should never happen if en.json exists)
  throw new Error('Critical: No translation files found, not even en.json');
}

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
export function createTranslator(translations: Translations): TranslateFn {
  return (key: string, params?: Record<string, string>): string => {
    // Parse key path (e.g., "ui.pay_with_card" or "errors.insufficient_funds_token.message")
    const parts = key.split('.');
    let value: unknown = translations;

    // Navigate the object tree
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        // Key not found, return the key itself as fallback
        return key;
      }
    }

    // Value should be a string at this point
    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters if provided (e.g., {amount} -> "$5.00")
    if (params) {
      return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) => str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue),
        value
      );
    }

    return value;
  };
}

/**
 * Get error message in current locale
 *
 * @param errorCode - Error code string (e.g., 'insufficient_funds_token')
 * @param translations - Current translations
 * @param includeAction - Whether to include action guidance
 * @returns Localized error message
 */
export function getLocalizedError(
  errorCode: string,
  translations: Translations,
  includeAction: boolean = true
): string {
  const error = translations.errors[errorCode];

  if (!error) {
    // Fallback to English error messages
    const fallback = getUserFriendlyError(errorCode);
    return includeAction && fallback.action
      ? `${fallback.message} ${fallback.action}`
      : fallback.message;
  }

  if (includeAction && error.action) {
    return `${error.message} ${error.action}`;
  }

  return error.message;
}
