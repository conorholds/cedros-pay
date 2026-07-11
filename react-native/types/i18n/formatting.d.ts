export type DateInput = string | number | Date;
export declare function formatDateOnly(value: DateInput, locale?: string, options?: Intl.DateTimeFormatOptions): string;
export declare function formatDateTimeValue(value: DateInput, locale?: string, options?: Intl.DateTimeFormatOptions): string;
export declare function formatNumberValue(value: number, locale?: string, options?: Intl.NumberFormatOptions): string;
export declare function formatCurrencyAmount(value: number, currency?: string, locale?: string, options?: Intl.NumberFormatOptions): string;
export declare function formatMinorCurrencyAmount(minorValue: number, currency?: string, locale?: string, options?: Intl.NumberFormatOptions): string;
export declare function selectPlural<T extends string>(count: number, forms: Partial<Record<Intl.LDMLPluralRule, T>> & {
    other: T;
}, locale?: string): T;
//# sourceMappingURL=formatting.d.ts.map