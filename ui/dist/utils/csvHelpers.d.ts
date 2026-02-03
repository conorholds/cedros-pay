/**
 * CSV Parsing Utilities
 *
 * Provides safe, consistent CSV string parsing for product tags,
 * category IDs, and other comma-separated values.
 */
/**
 * Parse a comma-separated string into an array of trimmed, non-empty values
 *
 * @param csv - Comma-separated string (e.g., "tag1, tag2, tag3")
 * @returns Array of trimmed, filtered values (e.g., ["tag1", "tag2", "tag3"])
 *
 * @example
 * parseCsv("a, b, c") // returns ["a", "b", "c"]
 * parseCsv("  x  ,  , y  ") // returns ["x", "y"]
 * parseCsv("") // returns []
 * parseCsv(null) // returns []
 * parseCsv(undefined) // returns []
 */
export declare function parseCsv(csv: string | null | undefined): string[];
/**
 * Convert an array of values to a comma-separated string
 *
 * @param values - Array of values to join
 * @returns Comma-separated string
 *
 * @example
 * toCsv(["a", "b", "c"]) // returns "a, b, c"
 * toCsv([]) // returns ""
 *
 * @deprecated This function is not used in production code. Will be removed in next major version.
 */
export declare function toCsv(values: string[]): string;
/**
 * Add a value to a CSV string (avoiding duplicates)
 *
 * @param csv - Existing CSV string
 * @param value - Value to add
 * @returns Updated CSV string
 *
 * @example
 * addToCsv("a, b", "c") // returns "a, b, c"
 * addToCsv("a, b", "a") // returns "a, b" (no duplicate)
 *
 * @deprecated This function is not used in production code. Will be removed in next major version.
 */
export declare function addToCsv(csv: string | null | undefined, value: string): string;
/**
 * Remove a value from a CSV string
 *
 * @param csv - Existing CSV string
 * @param value - Value to remove
 * @returns Updated CSV string
 *
 * @example
 * removeFromCsv("a, b, c", "b") // returns "a, c"
 * removeFromCsv("a, b", "c") // returns "a, b" (no change)
 *
 * @deprecated This function is not used in production code. Will be removed in next major version.
 */
export declare function removeFromCsv(csv: string | null | undefined, value: string): string;
//# sourceMappingURL=csvHelpers.d.ts.map