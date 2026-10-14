import type { ValidateConfigResponse } from './configApi';
import { REDACTED_VALUE } from './configMetadata';
import { validateSolanaAddress } from './TokenMintSelector';

type ValidationDraft = Record<string, unknown>;

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function hasConfiguredSecret(value: unknown): boolean {
  return hasText(value);
}

function requireText(
  config: ValidationDraft,
  key: string,
  label: string,
  errors: string[]
) {
  if (!hasText(config[key])) {
    errors.push(`${label} is required.`);
  }
}

function requireSecret(
  config: ValidationDraft,
  key: string,
  label: string,
  errors: string[]
) {
  if (!hasConfiguredSecret(config[key])) {
    errors.push(`${label} is required.`);
  }
}

function addStripeKeyChecks(config: ValidationDraft, errors: string[], warnings: string[]) {
  const mode = config.mode === 'live' ? 'live' : 'test';
  const publishableKey = hasText(config.publishable_key) ? config.publishable_key.trim() : '';
  const secretKey = hasText(config.secret_key) ? config.secret_key.trim() : '';
  if (publishableKey && !publishableKey.startsWith('pk_')) {
    errors.push('Stripe publishable key must start with pk_.');
  }
  if (secretKey && secretKey !== REDACTED_VALUE && !secretKey.startsWith('sk_')) {
    errors.push('Stripe secret key must start with sk_.');
  }
  if (publishableKey.startsWith('pk_test_') && mode === 'live') {
    warnings.push('Stripe is in live mode, but the publishable key is a test key.');
  }
  if (secretKey.startsWith('sk_test_') && mode === 'live') {
    warnings.push('Stripe is in live mode, but the secret key is a test key.');
  }
}

function validateStripeSetup(config: ValidationDraft, errors: string[], warnings: string[]) {
  requireText(config, 'publishable_key', 'Stripe publishable key', errors);
  requireSecret(config, 'secret_key', 'Stripe secret key', errors);
  addStripeKeyChecks(config, errors, warnings);
}

function requireSolanaAddress(
  config: ValidationDraft,
  key: string,
  label: string,
  errors: string[]
) {
  const value = hasText(config[key]) ? config[key].trim() : '';
  if (!value) {
    errors.push(`${label} is required.`);
  } else if (!validateSolanaAddress(value).valid) {
    errors.push(`${label} must be a valid Solana address.`);
  }
}

function validateX402Setup(config: ValidationDraft, errors: string[]) {
  requireSolanaAddress(config, 'payment_address', 'Crypto payout wallet', errors);
  requireSolanaAddress(config, 'token_mint', 'Crypto payment token', errors);
}

function validateNativeStoreSetup(config: ValidationDraft, errors: string[]) {
  if (!config.apple_enabled && !config.google_enabled) {
    errors.push('Enable Apple App Store or Google Play before checking setup.');
  }
  if (config.apple_enabled) {
    requireText(config, 'apple_issuer_id', 'Apple issuer ID', errors);
    requireText(config, 'apple_key_id', 'Apple key ID', errors);
    requireSecret(config, 'apple_private_key', 'Apple private key', errors);
    requireText(config, 'apple_bundle_id', 'Apple bundle ID', errors);
  }
  if (config.google_enabled) {
    requireText(config, 'google_service_account_email', 'Google service account email', errors);
    requireSecret(config, 'google_private_key', 'Google private key', errors);
    requireText(config, 'google_package_name', 'Google package name', errors);
    requireText(
      config,
      'google_push_service_account_email',
      'Google notification sender email',
      errors
    );
    requireText(config, 'google_push_audience', 'Google notification audience', errors);
  }
}

export function validateConfigSetup(
  category: string,
  config: ValidationDraft
): ValidateConfigResponse {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (category === 'stripe') validateStripeSetup(config, errors, warnings);
  if (category === 'x402') validateX402Setup(config, errors);
  if (category === 'native_store') validateNativeStoreSetup(config, errors);
  return { valid: errors.length === 0, errors, warnings };
}

export function mergeValidationResults(
  local: ValidateConfigResponse,
  remote: ValidateConfigResponse
): ValidateConfigResponse {
  const errors = Array.from(new Set([...local.errors, ...remote.errors]));
  const warnings = Array.from(new Set([...local.warnings, ...remote.warnings]));
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
