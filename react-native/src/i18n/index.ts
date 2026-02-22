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
 * Supported locales
 */
export type Locale = string;

/**
 * Static translation map — Metro requires all imports to be statically resolvable.
 * Each entry is a lazy getter so we only parse the JSON when first accessed.
 */
const TRANSLATION_MAP: Record<string, () => Translations> = {
  en: () => require('./translations/en.json'),
  ar: () => require('./translations/ar.json'),
  bn: () => require('./translations/bn.json'),
  de: () => require('./translations/de.json'),
  es: () => require('./translations/es.json'),
  fil: () => require('./translations/fil.json'),
  fr: () => require('./translations/fr.json'),
  he: () => require('./translations/he.json'),
  id: () => require('./translations/id.json'),
  in: () => require('./translations/in.json'),
  it: () => require('./translations/it.json'),
  jp: () => require('./translations/jp.json'),
  kr: () => require('./translations/kr.json'),
  ms: () => require('./translations/ms.json'),
  nl: () => require('./translations/nl.json'),
  pa: () => require('./translations/pa.json'),
  pl: () => require('./translations/pl.json'),
  pt: () => require('./translations/pt.json'),
  ru: () => require('./translations/ru.json'),
  ta: () => require('./translations/ta.json'),
  th: () => require('./translations/th.json'),
  tr: () => require('./translations/tr.json'),
  uk: () => require('./translations/uk.json'),
  ur: () => require('./translations/ur.json'),
  vn: () => require('./translations/vn.json'),
  zh: () => require('./translations/zh.json'),
};

/**
 * Translation cache to avoid re-parsing JSON
 */
const translationCache: Map<Locale, Translations> = new Map();

/**
 * Load a translation synchronously via static require.
 */
function loadTranslation(locale: Locale): Translations | null {
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!;
  }

  const loader = TRANSLATION_MAP[locale];
  if (!loader) {
    return null;
  }

  try {
    const data = loader();
    translationCache.set(locale, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Get list of available locales
 */
export async function getAvailableLocales(): Promise<Locale[]> {
  return Object.keys(TRANSLATION_MAP);
}

/**
 * Detect user's preferred locale from device-provided locale
 *
 * @param deviceLocale - Optional device locale string (e.g., 'en-US', 'es-ES').
 *                       Should be provided by react-native-localize in React Native.
 * @returns Detected locale code (e.g., 'en', 'es')
 */
export function detectLocale(deviceLocale?: string): Locale {
  if (deviceLocale) {
    return deviceLocale.split('-')[0].toLowerCase();
  }
  return 'en';
}

/**
 * Load translations for a specific locale with fallback to English.
 * Now synchronous internally but keeps async signature for API compat.
 */
export async function loadLocale(locale: Locale): Promise<Translations> {
  const translation = loadTranslation(locale);
  if (translation) {
    return translation;
  }

  // Fallback to English
  const fallback = loadTranslation('en');
  if (fallback) {
    return fallback;
  }

  throw new Error('Critical: No translation files found, not even en.json');
}

/**
 * Translation function type
 */
export type TranslateFn = (key: string, params?: Record<string, string>) => string;

/**
 * Create a translation function for a specific locale
 */
export function createTranslator(translations: Translations): TranslateFn {
  return (key: string, params?: Record<string, string>): string => {
    const parts = key.split('.');
    let value: unknown = translations;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

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
 */
export function getLocalizedError(
  errorCode: string,
  translations: Translations,
  includeAction: boolean = true
): string {
  const error = translations.errors[errorCode];

  if (!error) {
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
