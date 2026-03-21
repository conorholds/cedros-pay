"use strict";
/**
 * Content Security Policy (CSP) Helper
 *
 * Generates CSP directives for Cedros Pay to prevent common configuration errors
 * that break Stripe and Solana payment integrations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSP_PRESETS = exports.RPC_PROVIDERS = void 0;
exports.generateCSPDirectives = generateCSPDirectives;
exports.formatCSP = formatCSP;
exports.generateCSP = generateCSP;
/**
 * Get Solana RPC endpoint URL for a given cluster
 */
function getSolanaRpcUrl(cluster) {
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
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.host}`;
    }
    catch {
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
function generateCSPDirectives(config = {}) {
    const { solanaCluster = 'mainnet-beta', solanaEndpoint, customRpcProviders = [], allowUnsafeScripts = false, additionalScriptSrc = [], additionalConnectSrc = [], additionalFrameSrc = [], includeStripe = true, } = config;
    // Security warning for unsafe scripts
    if (allowUnsafeScripts) {
        console.warn('[CedrosPay] SECURITY WARNING: allowUnsafeScripts is enabled. ' +
            "This adds 'unsafe-inline' and 'unsafe-eval' to script-src, " +
            'which significantly weakens CSP protection against XSS attacks. ' +
            'Only use this in development or if absolutely required by your framework.');
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
    const frameSrc = ["'self'"]; // Always include 'self' for same-origin iframes
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
function formatCSP(directives, format = 'header') {
    const { scriptSrc, connectSrc, frameSrc } = directives;
    switch (format) {
        case 'header':
        case 'meta':
        case 'nextjs':
        case 'nginx': {
            // Standard CSP string format
            const parts = [];
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
            const helmetDirectives = {};
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
function generateCSP(config = {}, format = 'header') {
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
exports.RPC_PROVIDERS = {
    HELIUS: 'https://*.helius-rpc.com',
    QUICKNODE: 'https://*.quicknode.pro',
    ALCHEMY: 'https://*.alchemy.com',
    ANKR: 'https://rpc.ankr.com',
    TRITON: 'https://*.rpcpool.com',
};
/**
 * Preset CSP configurations for common scenarios
 */
exports.CSP_PRESETS = {
    /**
     * Mainnet production with custom RPC (recommended)
     */
    MAINNET_CUSTOM_RPC: (rpcEndpoint) => ({
        solanaCluster: 'mainnet-beta',
        solanaEndpoint: rpcEndpoint,
        allowUnsafeScripts: false,
    }),
    /**
     * Mainnet with Next.js (may require unsafe-inline/eval for some setups)
     * Note: Modern Next.js supports strict CSP without unsafe directives.
     * Only enable allowUnsafeScripts if necessary and understand the security implications.
     */
    MAINNET_NEXTJS: (rpcEndpoint) => ({
        solanaCluster: 'mainnet-beta',
        solanaEndpoint: rpcEndpoint,
        allowUnsafeScripts: false,
    }),
    /**
     * Devnet for testing
     */
    DEVNET: () => ({
        solanaCluster: 'devnet',
        allowUnsafeScripts: false,
    }),
    /**
     * Crypto-only payments (no Stripe)
     */
    CRYPTO_ONLY: (rpcEndpoint) => ({
        solanaCluster: 'mainnet-beta',
        solanaEndpoint: rpcEndpoint,
        includeStripe: false,
    }),
    /**
     * Stripe-only payments (no Solana)
     */
    STRIPE_ONLY: () => ({
        solanaCluster: 'mainnet-beta',
        includeStripe: true,
        // Don't include Solana RPC endpoints
        customRpcProviders: [],
    }),
};
//# sourceMappingURL=cspHelper.js.map