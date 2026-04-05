const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveAllowedPaymentMethods,
  resolvePaymentPolicy,
} = require('../lib/policy/resolveAllowedPaymentMethods.js');

const baseAdapters = {
  stripe: true,
  x402: true,
  crypto: false,
  credits: false,
  apple_iap: true,
  google_play_billing: true,
};

function makeContext(overrides = {}) {
  return {
    product: {
      id: 'pro_monthly',
      name: 'Pro Monthly',
      fulfillmentType: 'digital_in_app',
    },
    distributionChannel: 'unknown',
    storefrontRegion: 'unknown',
    availableAdapters: { ...baseAdapters },
    strictMode: true,
    purchaseMode: 'single',
    ...overrides,
  };
}

test('routes digital in-app products on Apple App Store to Apple IAP only', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({ distributionChannel: 'apple_app_store' })
  );

  assert.deepEqual(methods, ['apple_iap']);
});

test('routes digital in-app products on Google Play Store to Google Play Billing only', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({ distributionChannel: 'google_play_store' })
  );

  assert.deepEqual(methods, ['google_play_billing']);
});

test('allows Apple App Store digital products to expose external rails in the US when explicitly enabled', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({
      distributionChannel: 'apple_app_store',
      storefrontRegion: 'us',
      programs: {
        apple: {
          usStorefrontExternalPurchaseLink: true,
        },
      },
    })
  );

  assert.deepEqual(methods, ['apple_iap', 'stripe', 'x402']);
});

test('allows Google Play user choice billing to expose Google Play Billing alongside external rails', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({
      distributionChannel: 'google_play_store',
      storefrontRegion: 'us',
      programs: {
        google: {
          userChoiceBilling: true,
        },
      },
    })
  );

  assert.deepEqual(methods, ['google_play_billing', 'stripe', 'x402']);
});

test('allows Google Play alternative billing only to expose external rails when explicitly enrolled', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({
      distributionChannel: 'google_play_store',
      storefrontRegion: 'us',
      programs: {
        google: {
          alternativeBillingOnly: true,
        },
      },
      availableAdapters: {
        ...baseAdapters,
        google_play_billing: false,
      },
    })
  );

  assert.deepEqual(methods, ['stripe', 'x402']);
});

test('routes digital in-app products on Solana dApp Store to allowed external rails', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({
      distributionChannel: 'solana_dapp_store',
      availableAdapters: {
        ...baseAdapters,
        apple_iap: false,
        google_play_billing: false,
      },
    })
  );

  assert.deepEqual(methods, ['stripe', 'x402']);
});

test('routes physical goods on Apple App Store to external rails', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({
      distributionChannel: 'apple_app_store',
      product: { id: 'hoodie', fulfillmentType: 'physical_goods' },
    })
  );

  assert.deepEqual(methods, ['stripe', 'x402']);
});

test('routes physical goods on Google Play Store to external rails', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({
      distributionChannel: 'google_play_store',
      product: { id: 'hoodie', fulfillmentType: 'physical_goods' },
    })
  );

  assert.deepEqual(methods, ['stripe', 'x402']);
});

test('routes physical goods on Solana dApp Store to external rails', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({
      distributionChannel: 'solana_dapp_store',
      product: { id: 'hoodie', fulfillmentType: 'physical_goods' },
    })
  );

  assert.deepEqual(methods, ['stripe', 'x402']);
});

test('routes real world services on Apple App Store to external rails', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({
      distributionChannel: 'apple_app_store',
      product: { id: 'coaching', fulfillmentType: 'real_world_service' },
    })
  );

  assert.deepEqual(methods, ['stripe', 'x402']);
});

test('fails closed for digital in-app products with unknown channel in strict mode', () => {
  const resolution = resolvePaymentPolicy(makeContext());

  assert.deepEqual(resolution.allowedPaymentMethods, []);
  assert.equal(resolution.failure?.code, 'distribution_channel_required');
});

test('fails closed when Apple digital products do not have an Apple IAP adapter', () => {
  const resolution = resolvePaymentPolicy(
    makeContext({
      distributionChannel: 'apple_app_store',
      availableAdapters: {
        ...baseAdapters,
        apple_iap: false,
      },
    })
  );

  assert.deepEqual(resolution.allowedPaymentMethods, []);
  assert.equal(resolution.failure?.code, 'native_adapter_missing');
});

test('keeps Apple IAP as the safe default when a US external purchase program is configured without storefront context', () => {
  const resolution = resolvePaymentPolicy(
    makeContext({
      distributionChannel: 'apple_app_store',
      programs: {
        apple: {
          usStorefrontExternalPurchaseLink: true,
        },
      },
    })
  );

  assert.deepEqual(resolution.allowedPaymentMethods, ['apple_iap']);
  assert.equal(resolution.storefrontRegion, 'unknown');
});

test('allows Apple reader apps to expose external rails when the reader entitlement is configured', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({
      distributionChannel: 'apple_app_store',
      storefrontRegion: 'other',
      product: { id: 'reader_app', fulfillmentType: 'reader_content' },
      programs: {
        apple: {
          readerExternalLinkAccount: true,
        },
      },
    })
  );

  assert.deepEqual(methods, ['stripe', 'x402']);
});

test('fails closed for Apple reader apps without explicit entitlement outside the US storefront', () => {
  const resolution = resolvePaymentPolicy(
    makeContext({
      distributionChannel: 'apple_app_store',
      storefrontRegion: 'other',
      product: { id: 'reader_app', fulfillmentType: 'reader_content' },
    })
  );

  assert.deepEqual(resolution.allowedPaymentMethods, []);
  assert.equal(resolution.failure?.code, 'policy_restricted');
});

test('supports explicit strict mode override for unknown digital products when requested', () => {
  const methods = resolveAllowedPaymentMethods(
    makeContext({
      strictMode: false,
      availableAdapters: {
        ...baseAdapters,
        apple_iap: false,
        google_play_billing: false,
      },
    })
  );

  assert.deepEqual(methods, ['stripe', 'x402']);
});
