"use strict";
/**
 * useTranslation Hook
 *
 * React hook for accessing translations in components.
 * Automatically detects browser locale and loads translations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTranslation = useTranslation;
exports.useLocalizedError = useLocalizedError;
const react_1 = require("react");
const index_1 = require("./index");
const locales_1 = require("./locales");
const en_json_1 = __importDefault(require("./translations/en.json"));
const errorMessages_1 = require("../utils/errorMessages");
const FALLBACK_TRANSLATIONS = en_json_1.default;
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
function useTranslation(requestedLocale) {
    const [translations, setTranslations] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    // Determine locale (requested or browser default)
    const locale = (0, react_1.useMemo)(() => (0, locales_1.normalizeLocale)(requestedLocale || (0, index_1.detectLocale)()), [requestedLocale]);
    // Load translations
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        setIsLoading(true);
        try {
            const data = (0, index_1.loadLocale)(locale);
            if (!cancelled) {
                setTranslations(data);
                setIsLoading(false);
            }
        }
        catch (error) {
            console.error('[CedrosPay] Failed to load translations:', error);
            if (!cancelled) {
                setIsLoading(false);
            }
        }
        return () => {
            cancelled = true;
        };
    }, [locale]);
    // Create translator function
    const t = (0, react_1.useMemo)(() => {
        if (!translations) {
            // Fallback translator with English defaults to prevent flashing translation keys
            return (0, index_1.createTranslator)(FALLBACK_TRANSLATIONS);
        }
        return (0, index_1.createTranslator)(translations, FALLBACK_TRANSLATIONS);
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
function useLocalizedError(errorCode, includeAction = true) {
    const { translations } = useTranslation();
    if (!translations) {
        // Fallback to English error messages
        const fallback = (0, errorMessages_1.getUserFriendlyError)(errorCode);
        return includeAction && fallback.action
            ? `${fallback.message} ${fallback.action}`
            : fallback.message;
    }
    const error = translations.errors[errorCode];
    if (!error) {
        // Fallback to English error messages
        const fallback = (0, errorMessages_1.getUserFriendlyError)(errorCode);
        return includeAction && fallback.action
            ? `${fallback.message} ${fallback.action}`
            : fallback.message;
    }
    if (includeAction && error.action) {
        return `${error.message} ${error.action}`;
    }
    return error.message;
}
//# sourceMappingURL=useTranslation.js.map