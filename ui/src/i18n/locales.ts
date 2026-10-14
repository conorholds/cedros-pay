/**
 * Locale helpers shared by the web i18n loader and consumers.
 *
 * Translation filenames still include a few legacy region-style aliases
 * (`jp`, `kr`, `vn`, `in`). Runtime locale values are normalized to canonical
 * BCP 47 language subtags so browser/device locales can resolve correctly.
 */

export type Locale = string;
export type TextDirection = 'ltr' | 'rtl';

const LEGACY_TO_CANONICAL_LOCALE: Record<string, Locale> = {
  in: 'hi',
  jp: 'ja',
  kr: 'ko',
  vn: 'vi',
  iw: 'he',
};

const CANONICAL_TO_LEGACY_FILE: Record<string, Locale> = {
  hi: 'in',
  ja: 'jp',
  ko: 'kr',
  vi: 'vn',
};

const RTL_LOCALES = new Set(['ar', 'he', 'ur']);

function normalizeLocaleToken(locale: string): string {
  return locale.trim().replace(/_/g, '-').toLowerCase();
}

function localeBase(locale: string): string {
  return normalizeLocaleToken(locale).split('-')[0] || 'en';
}

export function normalizeLocale(locale?: string | null): Locale {
  if (!locale) {
    return 'en';
  }

  const normalized = normalizeLocaleToken(locale);
  const base = localeBase(normalized);
  return LEGACY_TO_CANONICAL_LOCALE[normalized] ?? LEGACY_TO_CANONICAL_LOCALE[base] ?? base;
}

export function getLocaleFileCandidates(locale?: string | null): Locale[] {
  const canonical = normalizeLocale(locale);
  const candidates = [
    canonical,
    CANONICAL_TO_LEGACY_FILE[canonical],
    locale ? normalizeLocaleToken(locale) : undefined,
    locale ? localeBase(locale) : undefined,
    'en',
  ];

  return candidates.filter((candidate, index): candidate is Locale => {
    return Boolean(candidate) && candidates.indexOf(candidate) === index;
  });
}

export function getLocaleDirection(locale?: string | null): TextDirection {
  return RTL_LOCALES.has(normalizeLocale(locale)) ? 'rtl' : 'ltr';
}

export function getNavigatorLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  const browserLocale = navigator.language || (navigator as { userLanguage?: string }).userLanguage;
  return normalizeLocale(browserLocale);
}
