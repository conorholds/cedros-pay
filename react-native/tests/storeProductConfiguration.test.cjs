const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mergeCedrosProductDefinition,
  resolveStoreProductConfiguration,
  selectGooglePlayOffer,
} = require('../lib/policy/resolveStoreProductConfiguration.js');

test('merges provider product catalog entries with explicit product props', () => {
  const merged = mergeCedrosProductDefinition({
    fallbackId: 'pro_monthly',
    catalogProduct: {
      id: 'pro_monthly',
      name: 'Pro Monthly',
      fulfillmentType: 'digital_in_app',
      storeProduct: {
        kind: 'auto_renewable_subscription',
        google: {
          basePlanId: 'monthly',
        },
      },
    },
    explicitProduct: {
      id: 'pro_monthly',
      fulfillmentType: 'digital_in_app',
      storeProduct: {
        apple: {
          productId: 'com.cedros.pro.monthly',
        },
      },
    },
  });

  assert.deepEqual(merged, {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    fulfillmentType: 'digital_in_app',
    storeProduct: {
      kind: 'auto_renewable_subscription',
      apple: {
        productId: 'com.cedros.pro.monthly',
      },
      google: {
        basePlanId: 'monthly',
      },
    },
  });
});

test('uses fallback resource id and fulfillment type when only catalog metadata is partial', () => {
  const merged = mergeCedrosProductDefinition({
    fallbackId: 'pro_unlock',
    fallbackFulfillmentType: 'digital_in_app',
    catalogProduct: {
      id: 'pro_unlock',
      name: 'Pro Unlock',
      fulfillmentType: 'digital_in_app',
      storeProduct: {
        apple: {
          productId: 'com.cedros.pro.unlock',
        },
      },
    },
  });

  assert.equal(merged.id, 'pro_unlock');
  assert.equal(merged.fulfillmentType, 'digital_in_app');
  assert.equal(merged.storeProduct.apple.productId, 'com.cedros.pro.unlock');
});

test('defaults Apple and Google store product ids to the Cedros product id', () => {
  const appleConfig = resolveStoreProductConfiguration(
    {
      id: 'pro_unlock',
      fulfillmentType: 'digital_in_app',
    },
    'apple_app_store'
  );
  const googleConfig = resolveStoreProductConfiguration(
    {
      id: 'pro_unlock',
      fulfillmentType: 'digital_in_app',
    },
    'google_play_store'
  );

  assert.equal(appleConfig.productId, 'pro_unlock');
  assert.equal(googleConfig.productId, 'pro_unlock');
  assert.equal(appleConfig.kind, 'non_consumable');
  assert.equal(googleConfig.kind, 'non_consumable');
  assert.equal(appleConfig.usedDefaultKind, true);
});

test('selects a Google Play offer using explicit base plan and offer id filters', () => {
  const offer = selectGooglePlayOffer(
    {
      productId: 'pro_monthly',
      subscriptionOfferDetails: [
        {
          basePlanId: 'monthly',
          offerId: null,
          offerToken: 'token-default',
        },
        {
          basePlanId: 'monthly',
          offerId: 'trial',
          offerToken: 'token-trial',
        },
      ],
    },
    {
      basePlanId: 'monthly',
      offerId: 'trial',
    }
  );

  assert.deepEqual(offer, {
    basePlanId: 'monthly',
    offerId: 'trial',
    offerToken: 'token-trial',
  });
});

test('fails closed for ambiguous Google Play subscription offers', () => {
  const offer = selectGooglePlayOffer(
    {
      productId: 'pro_monthly',
      subscriptionOfferDetails: [
        {
          basePlanId: 'monthly',
          offerId: null,
          offerToken: 'token-default',
        },
        {
          basePlanId: 'monthly',
          offerId: 'trial',
          offerToken: 'token-trial',
        },
      ],
    },
    {
      basePlanId: 'monthly',
    }
  );

  assert.equal(offer, null);
});
