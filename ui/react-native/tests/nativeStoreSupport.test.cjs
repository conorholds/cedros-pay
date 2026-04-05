const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveNativeStoreMethod,
  isRestorableStoreProduct,
  isManageableStoreSubscription,
} = require('../lib/policy/nativeStoreSupport.js');

test('maps Apple and Google distribution channels to native store methods', () => {
  assert.equal(resolveNativeStoreMethod('apple_app_store'), 'apple_iap');
  assert.equal(
    resolveNativeStoreMethod('google_play_store'),
    'google_play_billing'
  );
  assert.equal(resolveNativeStoreMethod('solana_dapp_store'), null);
});

test('treats non-consumables and subscriptions as restorable store products', () => {
  assert.equal(
    isRestorableStoreProduct({
      id: 'pro_unlock',
      fulfillmentType: 'digital_in_app',
      storeProduct: {
        kind: 'non_consumable',
      },
    }),
    true
  );
  assert.equal(
    isRestorableStoreProduct({
      id: 'pro_monthly',
      fulfillmentType: 'digital_in_app',
      storeProduct: {
        kind: 'auto_renewable_subscription',
      },
    }),
    true
  );
  assert.equal(
    isRestorableStoreProduct({
      id: 'coin_pack',
      fulfillmentType: 'digital_in_app',
      storeProduct: {
        kind: 'consumable',
      },
    }),
    false
  );
});

test('only treats auto-renewable subscriptions as manageable subscriptions', () => {
  assert.equal(
    isManageableStoreSubscription({
      id: 'pro_monthly',
      fulfillmentType: 'digital_in_app',
      storeProduct: {
        kind: 'auto_renewable_subscription',
      },
    }),
    true
  );
  assert.equal(
    isManageableStoreSubscription({
      id: 'pro_unlock',
      fulfillmentType: 'digital_in_app',
      storeProduct: {
        kind: 'non_consumable',
      },
    }),
    false
  );
});
