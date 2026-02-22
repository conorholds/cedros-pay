import { SolanaCluster } from '../types';
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
    /**
     * Whether to include Solana RPC directives
     * Set to false if only using Stripe payments
     * @default true
     */
    includeSolana?: boolean;
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
export type CSPFormat = 'header' | 'meta' | 'nextjs' | 'helmet' | 'nginx' | 'directives';
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
export declare function generateCSPDirectives(config?: CSPConfig): CSPDirectives;
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
export declare function formatCSP(directives: CSPDirectives, format?: CSPFormat): string | Record<string, string[]>;
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
export declare function generateCSP(config?: CSPConfig, format?: CSPFormat): string | Record<string, string[]>;
/**
 * Common RPC provider patterns for convenience
 *
 * SECURITY NOTE: These use wildcard subdomains for provider flexibility.
 * In production, consider using specific endpoints instead of wildcards.
 * Pass these to customRpcProviders array in CSPConfig.
 */
export declare const RPC_PROVIDERS: {
    readonly HELIUS: "https://*.helius-rpc.com";
    readonly QUICKNODE: "https://*.quicknode.pro";
    readonly ALCHEMY: "https://*.alchemy.com";
    readonly ANKR: "https://rpc.ankr.com";
    readonly TRITON: "https://*.rpcpool.com";
};
/**
 * Preset CSP configurations for common scenarios
 */
export declare const CSP_PRESETS: {
    /**
     * Mainnet production with custom RPC (recommended)
     */
    readonly MAINNET_CUSTOM_RPC: (rpcEndpoint: string) => CSPConfig;
    /**
     * Mainnet with Next.js (may require unsafe-inline/eval for some setups)
     * Note: Modern Next.js supports strict CSP without unsafe directives.
     * Only enable allowUnsafeScripts if necessary and understand the security implications.
     */
    readonly MAINNET_NEXTJS: (rpcEndpoint?: string) => CSPConfig;
    /**
     * Devnet for testing
     */
    readonly DEVNET: () => CSPConfig;
    /**
     * Crypto-only payments (no Stripe)
     */
    readonly CRYPTO_ONLY: (rpcEndpoint?: string) => CSPConfig;
    /**
     * Stripe-only payments (no Solana)
     */
    readonly STRIPE_ONLY: () => CSPConfig;
};
//# sourceMappingURL=cspHelper.d.ts.map