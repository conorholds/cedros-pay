import { normalizeLocale } from './locales';

export type DateInput = string | number | Date;

function toDate(value: DateInput): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localeOrUndefined(locale?: string): string | undefined {
  return locale ? normalizeLocale(locale) : undefined;
}

export function formatDateOnly(
  value: DateInput,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = toDate(value);
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat(localeOrUndefined(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(date);
}

export function formatDateTimeValue(
  value: DateInput,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = toDate(value);
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat(localeOrUndefined(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(date);
}

export function formatNumberValue(
  value: number,
  locale?: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(localeOrUndefined(locale), options).format(value);
}

function formatAmountWithAssetCode(
  value: number,
  currency: string,
  locale?: string,
  options?: Intl.NumberFormatOptions
): string {
  const numberOptions: Intl.NumberFormatOptions = { ...(options ?? {}) };
  delete numberOptions.style;
  delete numberOptions.currency;
  delete numberOptions.currencyDisplay;
  delete numberOptions.currencySign;

  const formattedValue = formatNumberValue(value, locale, numberOptions);
  const assetCode = currency.trim().toUpperCase();

  return assetCode ? `${formattedValue} ${assetCode}` : formattedValue;
}

function canFormatCurrency(currency: string): boolean {
  try {
    new Intl.NumberFormat(undefined, { style: 'currency', currency });
    return true;
  } catch (error) {
    if (error instanceof RangeError) {
      return false;
    }

    throw error;
  }
}

export function formatCurrencyAmount(
  value: number,
  currency = 'USD',
  locale?: string,
  options?: Intl.NumberFormatOptions
): string {
  if (!canFormatCurrency(currency)) {
    return formatAmountWithAssetCode(value, currency, locale, options);
  }

  return formatNumberValue(value, locale, {
    style: 'currency',
    currency,
    ...options,
  });
}

export function formatMinorCurrencyAmount(
  minorValue: number,
  currency = 'USD',
  locale?: string,
  options?: Intl.NumberFormatOptions
): string {
  if (!Number.isSafeInteger(minorValue) || !canFormatCurrency(currency)) return 'Amount unavailable';
  const decimals = currencyMinorDigits(currency.trim().toUpperCase());
  return formatCurrencyAmount(minorValue / (10 ** decimals), currency, locale, {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals, ...options,
  });
}

// Intl's *display* precision can differ from monetary units (e.g. HUF).
// Keep the unit conversion independent from locale/CLDR display preferences.
function currencyMinorDigits(currency: string): number {
  if (['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'].includes(currency)) return 0;
  if (['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'].includes(currency)) return 3;
  if (['CLF', 'UYW'].includes(currency)) return 4;
  return 2;
}

/** Stripe charge/refund units differ from ISO units for ISK and UGX.
 * HUF/TWD payout restrictions do not apply to payment/refund amounts.
 * https://docs.stripe.com/currencies#special-cases
 */
export function formatStripeMinorAmount(
  minorValue: number,
  currency: string,
  locale?: string
): string {
  const code = currency.trim().toUpperCase();
  if (!Number.isSafeInteger(minorValue)) return 'Amount unavailable';
  if (code === 'ISK' || code === 'UGX') {
    return formatCurrencyAmount(minorValue / 100, code, locale, { maximumFractionDigits: 2 });
  }
  if (code === 'MGA') return formatCurrencyAmount(minorValue, code, locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return formatMinorCurrencyAmount(minorValue, code, locale);
}

export function selectPlural<T extends string>(
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, T>> & { other: T },
  locale?: string
): T {
  const rule = new Intl.PluralRules(localeOrUndefined(locale)).select(count);
  return forms[rule] ?? forms.other;
}
