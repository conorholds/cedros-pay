import { afterEach, describe, expect, it } from 'vitest';

import {
  FEATURE_FLAG_REGISTRY,
  isFeatureEnabled,
  parseFeatureFlagBoolean,
  resolveFeatureFlags,
} from '../featureFlags';
import { validateConfig } from '../utils';

describe('feature flags', () => {
  const originalComplianceEnv = process.env.CEDROS_FEATURE_COMPLIANCE_CHECK;

  afterEach(() => {
    if (originalComplianceEnv === undefined) {
      delete process.env.CEDROS_FEATURE_COMPLIANCE_CHECK;
    } else {
      process.env.CEDROS_FEATURE_COMPLIANCE_CHECK = originalComplianceEnv;
    }
  });

  it('defines feature flags in a single registry with derived env vars', () => {
    expect(FEATURE_FLAG_REGISTRY.complianceCheck).toEqual({
      name: 'complianceCheck',
      description: 'Enable pre-flight compliance checks before Stripe checkout.',
      default: false,
      stage: 'stable',
      envVar: 'CEDROS_FEATURE_COMPLIANCE_CHECK',
    });
  });

  it('parses common boolean env values', () => {
    expect(parseFeatureFlagBoolean('1')).toBe(true);
    expect(parseFeatureFlagBoolean('true')).toBe(true);
    expect(parseFeatureFlagBoolean('yes')).toBe(true);
    expect(parseFeatureFlagBoolean('on')).toBe(true);
    expect(parseFeatureFlagBoolean('0')).toBe(false);
    expect(parseFeatureFlagBoolean('false')).toBe(false);
    expect(parseFeatureFlagBoolean('no')).toBe(false);
    expect(parseFeatureFlagBoolean('off')).toBe(false);
    expect(parseFeatureFlagBoolean('maybe')).toBeUndefined();
  });

  it('uses registry defaults when no overrides are provided', () => {
    expect(resolveFeatureFlags()).toEqual({
      complianceCheck: false,
    });
  });

  it('uses env overrides when config overrides are absent', () => {
    expect(
      resolveFeatureFlags({
        env: { CEDROS_FEATURE_COMPLIANCE_CHECK: 'yes' },
      })
    ).toEqual({
      complianceCheck: true,
    });
  });

  it('gives config overrides precedence over env overrides', () => {
    expect(
      resolveFeatureFlags({
        featureFlags: { complianceCheck: false },
        env: { CEDROS_FEATURE_COMPLIANCE_CHECK: 'true' },
      })
    ).toEqual({
      complianceCheck: false,
    });
  });

  it('supports fallback runtime overrides for legacy config fields', () => {
    expect(
      resolveFeatureFlags({
        fallbackFlags: { complianceCheck: true },
        env: { CEDROS_FEATURE_COMPLIANCE_CHECK: 'false' },
      })
    ).toEqual({
      complianceCheck: true,
    });
  });

  it('lets explicit featureFlags override legacy fallback config', () => {
    expect(
      resolveFeatureFlags({
        featureFlags: { complianceCheck: false },
        fallbackFlags: { complianceCheck: true },
      })
    ).toEqual({
      complianceCheck: false,
    });
  });

  it('reads process.env by default in isFeatureEnabled()', () => {
    process.env.CEDROS_FEATURE_COMPLIANCE_CHECK = 'on';
    expect(isFeatureEnabled('complianceCheck')).toBe(true);
  });

  it('validates featureFlags values through validateConfig', () => {
    expect(() =>
      validateConfig({
        stripePublicKey: 'pk_test_123',
        serverUrl: 'https://api.example.com',
        solanaCluster: 'devnet',
        featureFlags: {
          complianceCheck: true,
        },
      })
    ).not.toThrow();

    expect(() =>
      validateConfig({
        stripePublicKey: 'pk_test_123',
        serverUrl: 'https://api.example.com',
        solanaCluster: 'devnet',
        featureFlags: {
          complianceCheck: 'true' as unknown as boolean,
        },
      })
    ).toThrow(/featureFlags/);
  });
});
