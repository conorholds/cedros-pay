import type { CedrosConfig } from '../types';
import { validateTokenMint } from './tokenMintValidator';
import { getLogger } from './logger';

const REQUIRED_STRING_FIELDS: Array<keyof CedrosConfig> = [
  'stripePublicKey',
];

const ALLOWED_SOLANA_CLUSTERS = new Set(['mainnet-beta', 'devnet', 'testnet']);

interface ConfigIssue {
  field: string;
  message: string;
}

/**
 * Get default server URL - In React Native, serverUrl is always required
 * as there is no browser location to default to.
 */
function getDefaultServerUrl(): string {
  throw new Error(
    'serverUrl is required. Please provide a serverUrl in your CedrosConfig. ' +
    'Example: { serverUrl: "https://api.example.com" }'
  );
}

/**
 * Validate Cedros configuration before initializing providers/managers.
 *
 * Throws a detailed error listing every issue so developers can
 * correct misconfiguration quickly during integration.
 *
 * Note: serverUrl is always required in React Native (no browser location available)
 */
export function validateConfig(config: CedrosConfig): Required<CedrosConfig> & { serverUrl: string } {
  const issues: ConfigIssue[] = [];

  // Validate required string fields
  REQUIRED_STRING_FIELDS.forEach((field) => {
    const value = config[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      issues.push({
        field,
        message: 'must be a non-empty string',
      });
    }
  });

  // Validate or default serverUrl
  let serverUrl: string;
  if (config.serverUrl !== undefined) {
    // serverUrl was explicitly provided (even if empty)
    if (typeof config.serverUrl !== 'string' || config.serverUrl.trim().length === 0) {
      issues.push({
        field: 'serverUrl',
        message: 'must be a non-empty string when provided',
      });
      serverUrl = ''; // Will fail validation anyway
    } else {
      serverUrl = config.serverUrl;
    }
  } else {
    // serverUrl not provided, use default
    try {
      serverUrl = getDefaultServerUrl();
    } catch (error) {
      issues.push({
        field: 'serverUrl',
        message: error instanceof Error ? error.message : 'failed to determine default',
      });
      serverUrl = ''; // Will fail validation anyway
    }
  }

  // Validate Solana cluster
  if (!ALLOWED_SOLANA_CLUSTERS.has(config.solanaCluster)) {
    issues.push({
      field: 'solanaCluster',
      message: `must be one of ${Array.from(ALLOWED_SOLANA_CLUSTERS).join(', ')}`,
    });
  }

  // Validate optional fields
  if (config.solanaEndpoint !== undefined) {
    if (typeof config.solanaEndpoint !== 'string') {
      issues.push({
        field: 'solanaEndpoint',
        message: 'must be a string when provided',
      });
    } else if (config.solanaEndpoint.trim().length === 0) {
      issues.push({
        field: 'solanaEndpoint',
        message: 'must be a non-empty string when provided (e.g., "https://api.mainnet-beta.solana.com")',
      });
    } else if (!config.solanaEndpoint.startsWith('http://') && !config.solanaEndpoint.startsWith('https://')) {
      issues.push({
        field: 'solanaEndpoint',
        message: 'must start with "http://" or "https://" (e.g., "https://api.mainnet-beta.solana.com")',
      });
    }
  }

  if (config.tokenMint && typeof config.tokenMint !== 'string') {
    issues.push({
      field: 'tokenMint',
      message: 'must be a string when provided',
    });
  }

  if (issues.length > 0) {
    const details = issues.map((issue) => `- ${issue.field} ${issue.message}`).join('\n');
    throw new Error(`Invalid Cedros configuration:\n${details}`);
  }

  // Validate token mint against known stablecoins (STRICT by default)
  if (config.tokenMint) {
    const allowUnknown = config.dangerouslyAllowUnknownMint === true;
    const mintValidation = validateTokenMint(config.tokenMint, 'CedrosConfig.tokenMint', allowUnknown);

    // STRICT MODE: Fail validation for unknown mints
    if (!mintValidation.isValid && mintValidation.error) {
      throw new Error(mintValidation.error);
    }

    // PERMISSIVE MODE: Warn for unknown mints
    if (mintValidation.warning) {
      getLogger().warn(mintValidation.warning);
    }
  }

  // Return normalized config with serverUrl guaranteed
  return {
    ...config,
    serverUrl,
  } as Required<CedrosConfig> & { serverUrl: string };
}
