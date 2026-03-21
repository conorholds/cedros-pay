/**
 * Date formatting utilities
 *
 * Shared formatting functions for consistent date display across the application
 */
/**
 * Format an ISO date string to a locale date string
 * @param isoDate - ISO 8601 date string
 * @returns Formatted date string (e.g., "January 1, 2024")
 *
 * @example
 * formatDate('2024-01-15T12:00:00Z') // returns "January 15, 2024"
 */
export declare function formatDate(isoDate: string): string;
/**
 * Format an ISO date string to locale date and time
 * @param iso - ISO 8601 date string
 * @returns Formatted date and time string (e.g., "1/15/2024, 12:00:00 PM")
 *
 * @example
 * formatDateTime('2024-01-15T12:00:00Z') // returns "1/15/2024, 12:00:00 PM"
 */
export declare function formatDateTime(iso: string): string;
//# sourceMappingURL=dateHelpers.d.ts.map