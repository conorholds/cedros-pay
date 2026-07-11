"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateOnly = formatDateOnly;
exports.formatDateTimeValue = formatDateTimeValue;
exports.formatNumberValue = formatNumberValue;
exports.formatCurrencyAmount = formatCurrencyAmount;
exports.formatMinorCurrencyAmount = formatMinorCurrencyAmount;
exports.selectPlural = selectPlural;
const locales_1 = require("./locales");
function toDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function localeOrUndefined(locale) {
    return locale ? (0, locales_1.normalizeLocale)(locale) : undefined;
}
function formatDateOnly(value, locale, options) {
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
function formatDateTimeValue(value, locale, options) {
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
function formatNumberValue(value, locale, options) {
    return new Intl.NumberFormat(localeOrUndefined(locale), options).format(value);
}
function formatCurrencyAmount(value, currency = 'USD', locale, options) {
    return formatNumberValue(value, locale, {
        style: 'currency',
        currency,
        ...options,
    });
}
function formatMinorCurrencyAmount(minorValue, currency = 'USD', locale, options) {
    return formatCurrencyAmount(minorValue / 100, currency, locale, options);
}
function selectPlural(count, forms, locale) {
    const rule = new Intl.PluralRules(localeOrUndefined(locale)).select(count);
    return forms[rule] ?? forms.other;
}
//# sourceMappingURL=formatting.js.map