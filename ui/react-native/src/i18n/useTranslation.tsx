/**
 * useTranslation Hook
 *
 * React hook for accessing translations in components.
 * Automatically detects browser locale and loads translations.
 */

import { useState, useEffect, useMemo } from 'react';
import { detectLocale, loadLocale, createTranslator, type Translations, type TranslateFn, type Locale } from './index';
import { getUserFriendlyError } from '../utils/errorMessages';

/**
 * Translation hook return value
 */
export interface UseTranslationResult {
  /** Translation function */
  t: TranslateFn;
  /** Current locale */
  locale: Locale;
  /** Whether translations are loaded */
  isLoading: boolean;
  /** Full translations object (for advanced usage) */
  translations: Translations | null;
}

/**
 * Hook for accessing translations
 *
 * @param requestedLocale - Optional locale override (defaults to browser locale)
 * @returns Translation function and locale info
 *
 * @example
 * ```tsx
 * function PaymentButton() {
 *   const { t } = useTranslation();
 *   return <button>{t('ui.pay_with_card')}</button>;
 * }
 *
 * // With locale override
 * function SpanishButton() {
 *   const { t } = useTranslation('es');
 *   return <button>{t('ui.pay_with_card')}</button>; // "Pagar con Tarjeta"
 * }
 * ```
 */
export function useTranslation(requestedLocale?: Locale): UseTranslationResult {
  const [translations, setTranslations] = useState<Translations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determine locale (requested or browser default)
  const locale = useMemo(() => requestedLocale || detectLocale(), [requestedLocale]);

  // Load translations
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await loadLocale(locale);
        if (!cancelled) {
          setTranslations(data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[CedrosPay] Failed to load translations:', error);
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Create translator function
  const t = useMemo(() => {
    if (!translations) {
      // Fallback translator with English defaults to prevent flashing translation keys
      return (key: string) => {
        const fallbacks: Record<string, string> = {
          'ui.purchase': 'Purchase',
          'ui.pay_with_card': 'Pay with Card',
          'ui.pay_with_crypto': 'Pay with USDC',
          'ui.pay_with_usdc': 'Pay with USDC',
          'ui.card': 'Card',
          'ui.usdc_solana': 'USDC (Solana)',
          'ui.crypto': 'Crypto',
          'ui.processing': 'Processing...',
          'ui.loading': 'Loading...',
          'ui.connect_wallet': 'Connect Wallet',
          'ui.connecting': 'Connecting...',
        };
        return fallbacks[key] || key;
      };
    }
    return createTranslator(translations);
  }, [translations]);

  return {
    t,
    locale,
    isLoading,
    translations,
  };
}

/**
 * Get error message in current locale
 *
 * Convenience function for getting localized error messages.
 * Uses the translation hook internally.
 *
 * @param errorCode - Error code string
 * @param includeAction - Whether to include action guidance
 * @returns Localized error message
 *
 * @example
 * ```tsx
 * function ErrorDisplay({ error }: { error: PaymentError }) {
 *   const errorMessage = useLocalizedError(error.code);
 *   return <div>{errorMessage}</div>;
 * }
 * ```
 */
export function useLocalizedError(errorCode: string, includeAction: boolean = true): string {
  const { translations } = useTranslation();

  if (!translations) {
    // Fallback to English error messages
    const fallback = getUserFriendlyError(errorCode);
    return includeAction && fallback.action
      ? `${fallback.message} ${fallback.action}`
      : fallback.message;
  }

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
