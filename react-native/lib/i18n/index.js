"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableLocales = getAvailableLocales;
exports.detectLocale = detectLocale;
exports.loadLocale = loadLocale;
exports.createTranslator = createTranslator;
exports.getLocalizedError = getLocalizedError;
const errorMessages_1 = require("../utils/errorMessages");
const locales_1 = require("./locales");
/**
 * Static translation map — Metro requires all imports to be statically resolvable.
 * Each entry is a lazy getter so we only parse the JSON when first accessed.
 */
const TRANSLATION_MAP = {
    en: () => require('./translations/en.json'),
    ar: () => require('./translations/ar.json'),
    bn: () => require('./translations/bn.json'),
    de: () => require('./translations/de.json'),
    es: () => require('./translations/es.json'),
    fil: () => require('./translations/fil.json'),
    fr: () => require('./translations/fr.json'),
    he: () => require('./translations/he.json'),
    id: () => require('./translations/id.json'),
    hi: () => require('./translations/hi.json'),
    in: () => require('./translations/hi.json'),
    it: () => require('./translations/it.json'),
    ja: () => require('./translations/ja.json'),
    jp: () => require('./translations/ja.json'),
    ko: () => require('./translations/ko.json'),
    kr: () => require('./translations/ko.json'),
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
    vi: () => require('./translations/vi.json'),
    vn: () => require('./translations/vi.json'),
    zh: () => require('./translations/zh.json'),
};
/**
 * Translation cache to avoid re-parsing JSON
 */
const translationCache = new Map();
/**
 * Load a translation synchronously via static require.
 */
function loadTranslationFile(locale) {
    if (translationCache.has(locale)) {
        return translationCache.get(locale);
    }
    const loader = TRANSLATION_MAP[locale];
    if (!loader) {
        return null;
    }
    try {
        const data = loader();
        translationCache.set(locale, data);
        translationCache.set((0, locales_1.normalizeLocale)(data.locale), data);
        return data;
    }
    catch {
        return null;
    }
}
function loadTranslation(locale) {
    for (const candidate of (0, locales_1.getLocaleFileCandidates)(locale)) {
        const translation = loadTranslationFile(candidate);
        if (translation) {
            return translation;
        }
    }
    return null;
}
function mergeTranslations(fallback, translation) {
    return {
        ...fallback,
        ...translation,
        ui: { ...fallback.ui, ...translation.ui },
        errors: { ...fallback.errors, ...translation.errors },
        validation: { ...fallback.validation, ...translation.validation },
        wallet: { ...fallback.wallet, ...translation.wallet },
    };
}
function getEnglishTranslations() {
    const fallback = loadTranslationFile('en');
    if (!fallback) {
        throw new Error('Critical: No translation files found, not even en.json');
    }
    return fallback;
}
/**
 * Get list of available locales
 */
function getAvailableLocales() {
    return Array.from(new Set(Object.keys(TRANSLATION_MAP).map(locales_1.normalizeLocale))).sort();
}
/**
 * Detect user's preferred locale from device-provided locale
 *
 * @param deviceLocale - Optional device locale string (e.g., 'en-US', 'es-ES').
 *                       Should be provided by react-native-localize in React Native.
 * @returns Detected locale code (e.g., 'en', 'es')
 */
function detectLocale(deviceLocale) {
    if (deviceLocale) {
        return (0, locales_1.normalizeLocale)(deviceLocale);
    }
    return (0, locales_1.getDeviceLocaleFallback)();
}
/**
 * Load translations for a specific locale with fallback to English.
 */
function loadLocale(locale) {
    const fallback = getEnglishTranslations();
    const translation = loadTranslation((0, locales_1.normalizeLocale)(locale));
    if (translation) {
        return mergeTranslations(fallback, translation);
    }
    return fallback;
}
function lookupTranslation(translations, key) {
    const parts = key.split('.');
    let value = translations;
    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part];
        }
        else {
            return undefined;
        }
    }
    return value;
}
/**
 * Create a translation function for a specific locale
 */
function createTranslator(translations, fallbackTranslations = getEnglishTranslations()) {
    return (key, params) => {
        const value = lookupTranslation(translations, key) ?? lookupTranslation(fallbackTranslations, key);
        if (typeof value !== 'string') {
            return key;
        }
        if (params) {
            return Object.entries(params).reduce((str, [paramKey, paramValue]) => str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue)), value);
        }
        return value;
    };
}
/**
 * Get error message in current locale
 */
function getLocalizedError(errorCode, translations, includeAction = true) {
    const error = translations.errors[errorCode];
    if (!error) {
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
//# sourceMappingURL=index.js.map