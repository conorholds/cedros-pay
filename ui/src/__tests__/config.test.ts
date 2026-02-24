import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { validateConfig } from '../utils';

const baseConfig = {
  stripePublicKey: 'pk_test_123',
  serverUrl: 'https://api.example.com',
  solanaCluster: 'devnet' as const,
};

describe('validateConfig', () => {
  // Mock window.location for tests
  const originalWindow = global.window;

  beforeEach(() => {
    // Mock window for tests
    global.window = {
      location: {
        origin: 'https://example.com',
      },
    } as unknown as typeof window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it('passes through valid configuration with explicit serverUrl', () => {
    expect(validateConfig(baseConfig)).toEqual(baseConfig);
  });

  it('defaults serverUrl to window.location.origin when not provided', () => {
    const configWithoutServerUrl = {
      stripePublicKey: 'pk_test_123',
      solanaCluster: 'devnet' as const,
    };

    const result = validateConfig(configWithoutServerUrl);
    expect(result.serverUrl).toBe('https://example.com');
  });

  it('throws when serverUrl is not provided in SSR environment', () => {
    // Simulate SSR
    (global as unknown as { window: undefined }).window = undefined;

    expect(() =>
      validateConfig({
        stripePublicKey: 'pk_test_123',
        solanaCluster: 'devnet' as const,
      })
    ).toThrow(/serverUrl is required in SSR/);
  });

  it('throws when required string fields are missing', () => {
    expect(() =>
      validateConfig({
        ...baseConfig,
        stripePublicKey: '',
      })
    ).toThrow(/stripePublicKey/);
  });

  it('throws when serverUrl is provided but empty', () => {
    expect(() =>
      validateConfig({
        ...baseConfig,
        serverUrl: '',
      })
    ).toThrow(/serverUrl/);
  });

  it('throws when cluster is invalid', () => {
    expect(() =>
      validateConfig({
        ...baseConfig,
        solanaCluster: 'unknown' as 'devnet',
      })
    ).toThrow(/solanaCluster/);
  });

  it('does not require stripePublicKey when showCard is false (crypto-only)', () => {
    expect(() =>
      validateConfig({
        serverUrl: 'https://api.example.com',
        solanaCluster: 'devnet' as const,
        showCard: false,
      })
    ).not.toThrow();
  });

  it('still requires stripePublicKey when showCard is true', () => {
    expect(() =>
      validateConfig({
        serverUrl: 'https://api.example.com',
        solanaCluster: 'devnet' as const,
        showCard: true,
      })
    ).toThrow(/stripePublicKey/);
  });
});
