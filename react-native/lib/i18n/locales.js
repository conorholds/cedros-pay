"use strict";
/**
 * Locale helpers shared by the React Native i18n loader and consumers.
 *
 * Translation filenames still include a few legacy region-style aliases
 * (`jp`, `kr`, `vn`, `in`). Runtime locale values are normalized to canonical
 * BCP 47 language subtags so device locales can resolve correctly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLocale = normalizeLocale;
exports.getLocaleFileCandidates = getLocaleFileCandidates;
exports.getLocaleDirection = getLocaleDirection;
exports.getDeviceLocaleFallback = getDeviceLocaleFallback;
const LEGACY_TO_CANONICAL_LOCALE = {
    in: 'hi',
    jp: 'ja',
    kr: 'ko',
    vn: 'vi',
    iw: 'he',
};
const CANONICAL_TO_LEGACY_FILE = {
    hi: 'in',
    ja: 'jp',
    ko: 'kr',
    vi: 'vn',
};
const RTL_LOCALES = new Set(['ar', 'he', 'ur']);
function normalizeLocaleToken(locale) {
    return locale.trim().replace(/_/g, '-').toLowerCase();
}
function localeBase(locale) {
    return normalizeLocaleToken(locale).split('-')[0] || 'en';
}
function normalizeLocale(locale) {
    if (!locale) {
        return 'en';
    }
    const normalized = normalizeLocaleToken(locale);
    const base = localeBase(normalized);
    return LEGACY_TO_CANONICAL_LOCALE[normalized] ?? LEGACY_TO_CANONICAL_LOCALE[base] ?? base;
}
function getLocaleFileCandidates(locale) {
    const canonical = normalizeLocale(locale);
    const candidates = [
        canonical,
        CANONICAL_TO_LEGACY_FILE[canonical],
        locale ? normalizeLocaleToken(locale) : undefined,
        locale ? localeBase(locale) : undefined,
        'en',
    ];
    return candidates.filter((candidate, index) => {
        return Boolean(candidate) && candidates.indexOf(candidate) === index;
    });
}
function getLocaleDirection(locale) {
    return RTL_LOCALES.has(normalizeLocale(locale)) ? 'rtl' : 'ltr';
}
function getDeviceLocaleFallback() {
    const intlLocale = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().locale : undefined;
    return normalizeLocale(intlLocale);
}
//# sourceMappingURL=locales.js.map