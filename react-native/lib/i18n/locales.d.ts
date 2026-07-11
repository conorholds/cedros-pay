/**
 * Locale helpers shared by the React Native i18n loader and consumers.
 *
 * Translation filenames still include a few legacy region-style aliases
 * (`jp`, `kr`, `vn`, `in`). Runtime locale values are normalized to canonical
 * BCP 47 language subtags so device locales can resolve correctly.
 */
export type Locale = string;
export type TextDirection = 'ltr' | 'rtl';
export declare function normalizeLocale(locale?: string | null): Locale;
export declare function getLocaleFileCandidates(locale?: string | null): Locale[];
export declare function getLocaleDirection(locale?: string | null): TextDirection;
export declare function getDeviceLocaleFallback(): Locale;
//# sourceMappingURL=locales.d.ts.map