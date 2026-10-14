import { describe, expect, it } from 'vitest';
import {
  US_EU_CARDS_POLICY,
  effectiveMethodsForCountry,
  methodsForCountry,
  parseRegionalPaymentPolicy,
  readRegionalPaymentPolicy,
  resolvePaymentRailReadiness,
  type RegionalPaymentPolicy,
  validateRegionalPaymentPolicy,
} from '../../components/admin/regionalPaymentPolicy';

describe('regional payment policy model', () => {
  it('resolves the US and EU preset with stablecoin fallback', () => {
    expect(methodsForCountry(US_EU_CARDS_POLICY, 'US')).toEqual(['stripe', 'x402']);
    expect(methodsForCountry(US_EU_CARDS_POLICY, 'DE')).toEqual(['stripe', 'x402']);
    expect(methodsForCountry(US_EU_CARDS_POLICY, 'JP')).toEqual(['x402']);
    expect(methodsForCountry(US_EU_CARDS_POLICY, null)).toEqual(['x402']);
  });

  it('rejects overlapping countries and safely defaults malformed stored data', () => {
    expect(validateRegionalPaymentPolicy({
      ...US_EU_CARDS_POLICY,
      rules: [
        ...US_EU_CARDS_POLICY.rules,
        { id: 'duplicate', label: 'Duplicate', countries: ['US'], methods: ['credits'] },
      ],
    })).toBe('US can belong to only one region.');

    expect(readRegionalPaymentPolicy({ schemaVersion: 2 })).toMatchObject({
      schemaVersion: 1,
      enabled: false,
      fallbackMethods: ['stripe', 'x402', 'credits'],
    });
    expect(parseRegionalPaymentPolicy({
      ...US_EU_CARDS_POLICY,
      rules: [{ id: 'bad', label: 'Bad', countries: ['USA'], methods: ['stripe'] }],
    })).toBeNull();
  });

  it('allows empty method sets to explicitly block checkout', () => {
    const blocked: RegionalPaymentPolicy = {
      ...US_EU_CARDS_POLICY,
      fallbackMethods: [],
      rules: [{ id: 'blocked', label: 'Blocked', countries: ['US'], methods: [] }],
    };
    expect(validateRegionalPaymentPolicy(blocked)).toBeNull();
    expect(methodsForCountry(blocked, 'US')).toEqual([]);
    expect(methodsForCountry(blocked, 'JP')).toEqual([]);
  });
});

describe('payment rail readiness', () => {
  it('requires only user-visible standalone execution configuration', () => {
    expect(resolvePaymentRailReadiness(
      {},
      { enabled: true, publishable_key: 'pk_test', secret_key: '[REDACTED]' },
      { enabled: true, payment_address: 'wallet', token_mint: 'mint', rpc_url: '' },
      { enabled: true, credits_enabled: true }
    )).toEqual({ stripe: true, x402: false, credits: true });
  });

  it('uses the packaged host snapshot as the readiness authority', () => {
    const readiness = resolvePaymentRailReadiness({
      payment_availability_snapshot: JSON.stringify({
        paymentMethods: {
          stripe: { available: false },
          x402: { available: true },
          credits: { available: true },
        },
      }),
    }, {}, {}, {});

    expect(readiness).toEqual({ stripe: false, x402: true, credits: true });
    expect(effectiveMethodsForCountry(
      readRegionalPaymentPolicy(undefined),
      'US',
      readiness
    )).toEqual(['x402', 'credits']);
  });
});
