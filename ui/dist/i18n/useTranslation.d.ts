import { Translations, TranslateFn, Locale } from './index';
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
export declare function useTranslation(requestedLocale?: Locale): UseTranslationResult;
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
export declare function useLocalizedError(errorCode: string, includeAction?: boolean): string;
//# sourceMappingURL=useTranslation.d.ts.map