/**
 * Known stablecoin mint addresses on Solana mainnet-beta
 *
 * These are the canonical token mint addresses for major stablecoins.
 * Typos in token mint addresses result in payments being sent to the wrong token,
 * causing permanent loss of funds.
 *
 * This validator helps prevent catastrophic misconfigurations by warning
 * developers when they use an unrecognized token mint address.
 */
/** Stablecoin metadata including symbol, decimals, and icon */
export interface StablecoinMeta {
    symbol: string;
    decimals: number;
    icon: string;
}
/** Known stablecoins with full metadata */
export declare const STABLECOIN_METADATA: Record<string, StablecoinMeta>;
/** Simple symbol map for backwards compatibility */
export declare const KNOWN_STABLECOINS: Record<string, string>;
/**
 * Type guard to check if a token mint is a known stablecoin
 */
export declare function isKnownStablecoin(tokenMint: string): tokenMint is keyof typeof KNOWN_STABLECOINS;
/**
 * Get the symbol for a known stablecoin mint address
 * Returns undefined if the mint is not recognized
 */
export declare function getStablecoinSymbol(tokenMint: string): string | undefined;
/**
 * Validation result for token mint checks
 */
export interface TokenMintValidationResult {
    isValid: boolean;
    isKnownStablecoin: boolean;
    symbol?: string;
    warning?: string;
    error?: string;
}
/**
 * Validate a token mint address with strict mode by default
 *
 * STRICT MODE (default):
 * - Throws error for unknown mints to prevent fund loss
 * - Requires explicit dangerouslyAllowUnknownMint opt-in
 *
 * PERMISSIVE MODE (allowUnknown=true):
 * - Warns but doesn't fail for unknown mints
 * - Use only for custom tokens, testnet, or new stablecoins
 *
 * @param tokenMint - The token mint address to validate
 * @param context - Where the mint is being used (for better error messages)
 * @param allowUnknown - Whether to allow unknown mints (default: false)
 * @returns Validation result with errors or warnings
 *
 * @example
 * ```typescript
 * // Strict mode (default) - throws for unknown mints
 * const result = validateTokenMint(config.tokenMint, 'CedrosConfig', config.dangerouslyAllowUnknownMint);
 * if (!result.isValid) {
 *   throw new Error(result.error);
 * }
 *
 * // Permissive mode - warns for unknown mints
 * const result = validateTokenMint(customMint, 'custom', true);
 * if (result.warning) {
 *   console.warn(result.warning);
 * }
 * ```
 */
export declare function validateTokenMint(tokenMint: string | undefined, context?: string, allowUnknown?: boolean): TokenMintValidationResult;
/**
 * Similar to validateTokenMint but for the asset field in X402Requirement
 * Used when validating payment quotes from the backend
 *
 * @param asset - The asset/token mint from X402Requirement
 * @param resource - Resource ID for context in error messages
 * @param allowUnknown - Whether to allow unknown mints (from config.dangerouslyAllowUnknownMint)
 */
export declare function validateX402Asset(asset: string | undefined, resource?: string, allowUnknown?: boolean): TokenMintValidationResult;
//# sourceMappingURL=tokenMintValidator.d.ts.map