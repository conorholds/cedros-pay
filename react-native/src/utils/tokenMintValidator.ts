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

/** Stablecoin metadata including symbol and decimals */
export interface StablecoinMeta {
  symbol: string;
  decimals: number;
}

/** Known stablecoins with full metadata */
export const STABLECOIN_METADATA: Record<string, StablecoinMeta> = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
    symbol: 'USDC',
    decimals: 6,
  },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
    symbol: 'USDT',
    decimals: 6,
  },
  '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo': {
    symbol: 'PYUSD',
    decimals: 6,
  },
  'CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH': {
    symbol: 'CASH',
    decimals: 6,
  },
};

/** Simple symbol map for backwards compatibility */
export const KNOWN_STABLECOINS = Object.fromEntries(
  Object.entries(STABLECOIN_METADATA).map(([mint, meta]) => [mint, meta.symbol])
) as Record<string, string>;

/**
 * Type guard to check if a token mint is a known stablecoin
 */
export function isKnownStablecoin(tokenMint: string): tokenMint is keyof typeof KNOWN_STABLECOINS {
  return tokenMint in KNOWN_STABLECOINS;
}

/**
 * Get the symbol for a known stablecoin mint address
 * Returns undefined if the mint is not recognized
 */
export function getStablecoinSymbol(tokenMint: string): string | undefined {
  if (isKnownStablecoin(tokenMint)) {
    return KNOWN_STABLECOINS[tokenMint];
  }
  return undefined;
}

/**
 * Validation result for token mint checks
 */
export interface TokenMintValidationResult {
  isValid: boolean;
  isKnownStablecoin: boolean;
  symbol?: string;
  warning?: string;
  error?: string; // Error message if validation fails (strict mode)
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
export function validateTokenMint(
  tokenMint: string | undefined,
  context: string = 'token mint',
  allowUnknown: boolean = false
): TokenMintValidationResult {
  // Empty or undefined is valid (uses backend default)
  if (!tokenMint || tokenMint.trim().length === 0) {
    return {
      isValid: true,
      isKnownStablecoin: false,
    };
  }

  const trimmedMint = tokenMint.trim();

  // Check if it's a known stablecoin
  if (isKnownStablecoin(trimmedMint)) {
    const symbol = KNOWN_STABLECOINS[trimmedMint];
    return {
      isValid: true,
      isKnownStablecoin: true,
      symbol,
    };
  }

  // Not a known stablecoin - behavior depends on mode
  const knownMints = Object.entries(KNOWN_STABLECOINS)
    .map(([mint, symbol]) => `  ${symbol}: ${mint}`)
    .join('\n');

  if (!allowUnknown) {
    // STRICT MODE: Error for unknown mints (prevents fund loss)
    const error = [
      `SAFETY ERROR: Unrecognized token mint address in ${context}`,
      `  Provided: ${trimmedMint}`,
      '',
      'This token mint does not match any known stablecoin addresses.',
      'Using an unknown token mint can result in PERMANENT LOSS OF FUNDS if it\'s a typo.',
      '',
      'Known stablecoin mints (mainnet-beta):',
      knownMints,
      '',
      'If you are CERTAIN this is the correct mint address (custom token, testnet, or new stablecoin),',
      'set dangerouslyAllowUnknownMint={true} in your CedrosProvider config:',
      '',
      '  <CedrosProvider',
      '    config={{',
      '      ...',
      '      tokenMint: "' + trimmedMint + '",',
      '      dangerouslyAllowUnknownMint: true, // ⚠️ I have verified this mint address',
      '    }}',
      '  />',
      '',
      '⚠️ WARNING: Only enable dangerouslyAllowUnknownMint if you have TRIPLE-CHECKED the mint address.',
    ].join('\n');

    return {
      isValid: false,
      isKnownStablecoin: false,
      error,
    };
  } else {
    // PERMISSIVE MODE: Warn for unknown mints
    const warning = [
      `Warning: Unrecognized token mint address in ${context}`,
      `  Provided: ${trimmedMint}`,
      '',
      'This token mint does not match any known stablecoin addresses.',
      'You have set dangerouslyAllowUnknownMint=true, so this will proceed.',
      'If this is a typo, payments will be sent to the wrong token and funds will be PERMANENTLY LOST.',
      '',
      'Known stablecoin mints (mainnet-beta):',
      knownMints,
      '',
      'Double-check your token mint address before deploying to production.',
    ].join('\n');

    return {
      isValid: true, // Allow but warn
      isKnownStablecoin: false,
      warning,
    };
  }
}

/**
 * Similar to validateTokenMint but for the asset field in X402Requirement
 * Used when validating payment quotes from the backend
 *
 * @param asset - The asset/token mint from X402Requirement
 * @param resource - Resource ID for context in error messages
 * @param allowUnknown - Whether to allow unknown mints (from config.dangerouslyAllowUnknownMint)
 */
export function validateX402Asset(
  asset: string | undefined,
  resource: string = 'unknown',
  allowUnknown: boolean = false
): TokenMintValidationResult {
  return validateTokenMint(asset, `X402Requirement (resource: ${resource})`, allowUnknown);
}
