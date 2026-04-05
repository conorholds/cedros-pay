const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mapPaywallProductToCedrosProductDefinition,
  createCedrosProductCatalogFromPaywallProducts,
} = require('../lib/policy/paywallProductCatalog.js');

test('maps explicit store policy fulfillment and store billing config from paywall products', () => {
  const mapped = mapPaywallProductToCedrosProductDefinition({
    id: 'pro_monthly',
    title: 'Pro Monthly',
    fulfillment: {
      type: 'digital_download',
    },
    metadata: {
      store_policy_fulfillment_type: 'reader_content',
    },
    storeBilling: {
      kind: 'auto_renewable_subscription',
      apple: {
        productId: 'com.cedros.pro.monthly',
      },
      google: {
        productId: 'pro_monthly',
        packageName: 'com.cedros.app',
        basePlanId: 'monthly',
      },
    },
  });

  assert.deepEqual(mapped, {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    fulfillmentType: 'reader_content',
    storeProduct: {
      kind: 'auto_renewable_subscription',
      apple: {
        productId: 'com.cedros.pro.monthly',
      },
      google: {
        productId: 'pro_monthly',
        packageName: 'com.cedros.app',
        basePlanId: 'monthly',
      },
    },
  });
});

test('derives conservative fulfillment defaults from generic catalog data', () => {
  const physical = mapPaywallProductToCedrosProductDefinition({
    id: 'hoodie',
    title: 'Hoodie',
    fulfillment: {
      type: 'shipping',
    },
  });
  const service = mapPaywallProductToCedrosProductDefinition({
    id: 'coaching',
    title: 'Coaching',
    fulfillment: {
      type: 'service',
    },
  });
  const digital = mapPaywallProductToCedrosProductDefinition({
    id: 'pro_unlock',
    title: 'Pro Unlock',
    fulfillment: {
      type: 'digital_download',
    },
  });

  assert.equal(physical.fulfillmentType, 'physical_goods');
  assert.equal(service.fulfillmentType, 'real_world_service');
  assert.equal(digital.fulfillmentType, 'digital_in_app');
});

test('creates a keyed Cedros product catalog from paywall products', () => {
  const catalog = createCedrosProductCatalogFromPaywallProducts([
    {
      id: 'pro_unlock',
      title: 'Pro Unlock',
      fulfillment: {
        type: 'digital_download',
      },
    },
    {
      id: 'hoodie',
      title: 'Hoodie',
      fulfillment: {
        type: 'shipping',
      },
    },
  ]);

  assert.equal(catalog.pro_unlock.id, 'pro_unlock');
  assert.equal(catalog.pro_unlock.fulfillmentType, 'digital_in_app');
  assert.equal(catalog.hoodie.fulfillmentType, 'physical_goods');
});
