/**
 * Content Security Policy (CSP) Helper
 *
 * Generates CSP directives for Cedros Pay to prevent common configuration errors
 * that break Stripe and Solana payment integrations.
 */

import type { SolanaCluster } from '../types';

/**
 * CSP generation options
 */
export interface CSPConfig {
  /**
   * Solana network cluster
   * Determines which Solana RPC endpoints to include
   */
  solanaCluster?: SolanaCluster;

  /**
   * Custom Solana RPC endpoint URL
   * If provided, this domain will be added to connect-src
   * @example "https://mainnet.helius-rpc.com"
   */
  solanaEndpoint?: string;

  /**
   * Additional custom RPC providers
   * Common providers: Helius, QuickNode, Alchemy, Ankr
   * @example ["https://*.helius-rpc.com", "https://*.quicknode.pro"]
   */
  customRpcProviders?: string[];

  /**
   * Whether to include 'unsafe-inline' and 'unsafe-eval' in script-src
   * Required for some frameworks (Next.js, etc.)
   * @default false
   */
  allowUnsafeScripts?: boolean;

  /**
   * Additional domains to include in script-src
   * @example ["https://cdn.example.com"]
   */
  additionalScriptSrc?: string[];

  /**
   * Additional domains to include in connect-src
   * @example ["https://api.example.com"]
   */
  additionalConnectSrc?: string[];

  /**
   * Additional domains to include in frame-src
   * @example ["https://embed.example.com"]
   */
  additionalFrameSrc?: string[];

  /**
   * Whether to include Stripe directives
   * Set to false if only using crypto payments
   * @default true
   */
  includeStripe?: boolean;
}

/**
 * Generated CSP directives
 */
export interface CSPDirectives {
  scriptSrc: string[];
  connectSrc: string[];
  frameSrc: string[];
}

/**
 * CSP output format for different frameworks
 */
export type CSPFormat =
  | 'header' // Standard HTTP header format
  | 'meta' // HTML meta tag format
  | 'nextjs' // Next.js config format (string)
  | 'helmet' // Express helmet format (array)
  | 'nginx' // Nginx config format
  | 'directives'; // Object with directive arrays

/**
 * Get Solana RPC endpoint URL for a given cluster
 */
function getSolanaRpcUrl(cluster: SolanaCluster): string {
  switch (cluster) {
    case 'mainnet-beta':
      return 'https://api.mainnet-beta.solana.com';
    case 'devnet':
      return 'https://api.devnet.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    default:
      return 'https://api.mainnet-beta.solana.com';
  }
}

/**
 * Extract domain from URL for CSP
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    // If URL parsing fails, return as-is (might be a pattern like *.example.com)
    return url;
  }
}

/**
 * Generate CSP directives for Cedros Pay
 *
 * @param config - CSP configuration options
 * @returns Object containing script-src, connect-src, and frame-src arrays
 *
 * @example
 * ```typescript
 * const directives = generateCSPDirectives({
 *   solanaCluster: 'mainnet-beta',
 *   solanaEndpoint: 'https://mainnet.helius-rpc.com',
 *   allowUnsafeScripts: true, // Required for Next.js
 * });
 * ```
 */
export function generateCSPDirectives(config: CSPConfig = {}): CSPDirectives {
  const {
    solanaCluster = 'mainnet-beta',
    solanaEndpoint,
    customRpcProviders = [],
    allowUnsafeScripts = false,
    additionalScriptSrc = [],
    additionalConnectSrc = [],
    additionalFrameSrc = [],
    includeStripe = true,
  } = config;

  // Security warning for unsafe scripts
  if (allowUnsafeScripts) {
    console.warn(
      '[CedrosPay] SECURITY WARNING: allowUnsafeScripts is enabled. ' +
        "This adds 'unsafe-inline' and 'unsafe-eval' to script-src, " +
        'which significantly weakens CSP protection against XSS attacks. ' +
        'Only use this in development or if absolutely required by your framework.'
    );
  }

  // Build script-src
  const scriptSrc = ["'self'"];
  if (allowUnsafeScripts) {
    scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
  }
  if (includeStripe) {
    scriptSrc.push('https://js.stripe.com');
  }
  scriptSrc.push(...additionalScriptSrc);

  // Build connect-src
  const connectSrc = ["'self'"];

  // Add Stripe domains
  if (includeStripe) {
    connectSrc.push('https://api.stripe.com', 'https://*.stripe.com');
  }

  // Add Solana RPC endpoint for the selected cluster
  // SECURITY: Only add the specific endpoint for the selected cluster,
  // not wildcards like *.solana.com which would allow any subdomain
  const solanaRpcUrl = getSolanaRpcUrl(solanaCluster);
  connectSrc.push(solanaRpcUrl);

  // Add custom Solana endpoint if provided
  if (solanaEndpoint) {
    const customDomain = extractDomain(solanaEndpoint);
    if (!connectSrc.includes(customDomain)) {
      connectSrc.push(customDomain);
    }
  }

  // Add custom RPC providers
  customRpcProviders.forEach((provider) => {
    if (!connectSrc.includes(provider)) {
      connectSrc.push(provider);
    }
  });

  // Add additional connect-src domains
  connectSrc.push(...additionalConnectSrc);

  // Build frame-src
  const frameSrc: string[] = ["'self'"];  // Always include 'self' for same-origin iframes
  if (includeStripe) {
    frameSrc.push('https://js.stripe.com', 'https://checkout.stripe.com');
  }
  frameSrc.push(...additionalFrameSrc);

  return {
    scriptSrc,
    connectSrc,
    frameSrc,
  };
}

/**
 * Format CSP directives for different frameworks and environments
 *
 * @param directives - CSP directives from generateCSPDirectives()
 * @param format - Output format
 * @returns Formatted CSP string or object
 *
 * @example
 * ```typescript
 * const directives = generateCSPDirectives({ solanaCluster: 'mainnet-beta' });
 *
 * // HTTP Header format
 * const header = formatCSP(directives, 'header');
 * // "script-src 'self' https://js.stripe.com; connect-src 'self' ..."
 *
 * // Next.js config format
 * const nextjs = formatCSP(directives, 'nextjs');
 *
 * // Express helmet format
 * const helmet = formatCSP(directives, 'helmet');
 * ```
 */
export function formatCSP(
  directives: CSPDirectives,
  format: CSPFormat = 'header'
): string | Record<string, string[]> {
  const { scriptSrc, connectSrc, frameSrc } = directives;

  switch (format) {
    case 'header':
    case 'meta':
    case 'nextjs':
    case 'nginx': {
      // Standard CSP string format
      const parts: string[] = [];
      if (scriptSrc.length > 0) {
        parts.push(`script-src ${scriptSrc.join(' ')}`);
      }
      if (connectSrc.length > 0) {
        parts.push(`connect-src ${connectSrc.join(' ')}`);
      }
      if (frameSrc.length > 0) {
        parts.push(`frame-src ${frameSrc.join(' ')}`);
      }
      return parts.join('; ');
    }

    case 'helmet': {
      // Express helmet format (arrays)
      const helmetDirectives: Record<string, string[]> = {};
      if (scriptSrc.length > 0) {
        helmetDirectives.scriptSrc = scriptSrc;
      }
      if (connectSrc.length > 0) {
        helmetDirectives.connectSrc = connectSrc;
      }
      if (frameSrc.length > 0) {
        helmetDirectives.frameSrc = frameSrc;
      }
      return helmetDirectives;
    }

    case 'directives':
      // Return raw directives object
      return { scriptSrc, connectSrc, frameSrc };

    default:
      throw new Error(`Unknown CSP format: ${format}`);
  }
}

/**
 * Generate CSP string for Cedros Pay (convenience function)
 *
 * Combines generateCSPDirectives() and formatCSP() into a single call.
 *
 * @param config - CSP configuration options
 * @param format - Output format (default: 'header')
 * @returns Formatted CSP string or object
 *
 * @example
 * ```typescript
 * // Quick CSP generation for HTTP headers
 * const csp = generateCSP({
 *   solanaCluster: 'mainnet-beta',
 *   solanaEndpoint: 'https://mainnet.helius-rpc.com',
 *   allowUnsafeScripts: true,
 * });
 * // "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; ..."
 *
 * // For Express helmet
 * const helmetCSP = generateCSP({ solanaCluster: 'mainnet-beta' }, 'helmet');
 * app.use(helmet.contentSecurityPolicy({ directives: helmetCSP }));
 * ```
 */
export function generateCSP(
  config: CSPConfig = {},
  format: CSPFormat = 'header'
): string | Record<string, string[]> {
  const directives = generateCSPDirectives(config);
  return formatCSP(directives, format);
}

/**
 * Common RPC provider patterns for convenience
 * 
 * SECURITY NOTE: These use wildcard subdomains for provider flexibility.
 * In production, consider using specific endpoints instead of wildcards.
 * Pass these to customRpcProviders array in CSPConfig.
 */
export const RPC_PROVIDERS = {
  HELIUS: 'https://*.helius-rpc.com',
  QUICKNODE: 'https://*.quicknode.pro',
  ALCHEMY: 'https://*.alchemy.com',
  ANKR: 'https://rpc.ankr.com',
  TRITON: 'https://*.rpcpool.com',
} as const;

/**
 * Preset CSP configurations for common scenarios
 */
export const CSP_PRESETS = {
  /**
   * Mainnet production with custom RPC (recommended)
   */
  MAINNET_CUSTOM_RPC: (rpcEndpoint: string): CSPConfig => ({
    solanaCluster: 'mainnet-beta',
    solanaEndpoint: rpcEndpoint,
    allowUnsafeScripts: false,
  }),

  /**
   * Mainnet with Next.js (may require unsafe-inline/eval for some setups)
   * Note: Modern Next.js supports strict CSP without unsafe directives.
   * Only enable allowUnsafeScripts if necessary and understand the security implications.
   */
  MAINNET_NEXTJS: (rpcEndpoint?: string): CSPConfig => ({
    solanaCluster: 'mainnet-beta',
    solanaEndpoint: rpcEndpoint,
    allowUnsafeScripts: false,
  }),

  /**
   * Devnet for testing
   */
  DEVNET: (): CSPConfig => ({
    solanaCluster: 'devnet',
    allowUnsafeScripts: false,
  }),

  /**
   * Crypto-only payments (no Stripe)
   */
  CRYPTO_ONLY: (rpcEndpoint?: string): CSPConfig => ({
    solanaCluster: 'mainnet-beta',
    solanaEndpoint: rpcEndpoint,
    includeStripe: false,
  }),

  /**
   * Stripe-only payments (no Solana)
   */
  STRIPE_ONLY: (): CSPConfig => ({
    solanaCluster: 'mainnet-beta',
    includeStripe: true,
    // Don't include Solana RPC endpoints
    customRpcProviders: [],
  }),
} as const;
