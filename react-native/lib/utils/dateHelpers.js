"use strict";
/**
 * Date formatting utilities
 *
 * Shared formatting functions for consistent date display across the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
const formatting_1 = require("../i18n/formatting");
/**
 * Format an ISO date string to a locale date string
 * @param isoDate - ISO 8601 date string
 * @param locale - Optional BCP 47 locale override
 * @returns Formatted date string (e.g., "January 1, 2024")
 *
 * @example
 * formatDate('2024-01-15T12:00:00Z') // returns "January 15, 2024"
 */
function formatDate(isoDate, locale) {
    return (0, formatting_1.formatDateOnly)(isoDate, locale);
}
/**
 * Format an ISO date string to locale date and time
 * @param iso - ISO 8601 date string
 * @param locale - Optional BCP 47 locale override
 * @returns Formatted date and time string (e.g., "1/15/2024, 12:00:00 PM")
 *
 * @example
 * formatDateTime('2024-01-15T12:00:00Z') // returns "1/15/2024, 12:00:00 PM"
 */
function formatDateTime(iso, locale) {
    return (0, formatting_1.formatDateTimeValue)(iso, locale);
}
//# sourceMappingURL=dateHelpers.js.map