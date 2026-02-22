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
//# sourceMappingURL=csvHelpers.d.ts.map