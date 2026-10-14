import { describe, expect, it } from 'vitest';
import { mergeValidationResults, validateConfigSetup } from '../../components/admin/configSetupValidation';

const VALID_WALLET = '11111111111111111111111111111111';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

describe('config setup validation', () => {
  it('accepts complete Stripe setup without any webhook field', () => {
    const result = validateConfigSetup('stripe', {
      mode: 'test',
      publishable_key: 'pk_test_123',
      secret_key: '[REDACTED]',
    });

    expect(result).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('rejects missing Stripe setup fields', () => {
    const result = validateConfigSetup('stripe', {
      mode: 'test',
      publishable_key: '',
      secret_key: '[REDACTED]',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['Stripe publishable key is required.']);
  });

  it('rejects invalid Crypto setup before backend validation', () => {
    const result = validateConfigSetup('x402', {
      payment_address: 'not-a-wallet',
      token_mint: '',
      gasless_enabled: true,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Crypto payout wallet must be a valid Solana address.');
    expect(result.errors).toContain('Crypto payment token is required.');
  });

  it('accepts complete Crypto setup', () => {
    const result = validateConfigSetup('x402', {
      payment_address: VALID_WALLET,
      token_mint: USDC_MINT,
      gasless_enabled: true,
    });

    expect(result).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('rejects enabled App Store setup with missing credentials', () => {
    const result = validateConfigSetup('native_store', {
      apple_enabled: true,
      apple_issuer_id: '',
      apple_key_id: '',
      apple_private_key: '',
      apple_bundle_id: '',
      google_enabled: false,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Apple issuer ID is required.');
    expect(result.errors).toContain('Apple private key is required.');
  });

  it('rejects Google Play setup without authenticated push identity settings', () => {
    const result = validateConfigSetup('native_store', {
      apple_enabled: false,
      google_enabled: true,
      google_service_account_email: 'publisher@example.iam.gserviceaccount.com',
      google_private_key: '[REDACTED]',
      google_package_name: 'com.example.app',
      google_push_service_account_email: '',
      google_push_audience: '',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Google notification sender email is required.');
    expect(result.errors).toContain('Google notification audience is required.');
  });

  it('merges local and backend validation without duplicate messages', () => {
    const result = mergeValidationResults(
      { valid: true, errors: [], warnings: ['Review this setting.'] },
      { valid: false, errors: ['Backend error.'], warnings: ['Review this setting.'] }
    );

    expect(result).toEqual({
      valid: false,
      errors: ['Backend error.'],
      warnings: ['Review this setting.'],
    });
  });
});
