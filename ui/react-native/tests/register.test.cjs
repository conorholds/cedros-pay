const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'react-native') {
    return {
      Linking: { openURL: async () => undefined },
      Pressable: 'Pressable',
      StyleSheet: { create: (styles) => styles },
      Text: 'Text',
      View: 'View',
    };
  }
  return originalLoad(request, parent, isMain);
};

const registerCedrosPayNativeSurface = require('../lib/register.js').default;

test.after(() => {
  Module._load = originalLoad;
});

function readArchiveJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../', fileName), 'utf8')
  );
}

test('returns the canonical Cedros extension bootstrap for native registration', () => {
  const bootstrap = registerCedrosPayNativeSurface();
  const archiveManifest = readArchiveJson('cedros-extension.manifest.json');
  const archiveBootstrap = readArchiveJson('cedros-extension.bootstrap.json');

  assert.equal(bootstrap.manifest.schemaVersion, 1);
  assert.equal(bootstrap.manifest.extensionId, 'cedros-pay');
  assert.equal(bootstrap.manifest.platformApiVersion, '1');
  assert.equal(bootstrap.manifest.compatibility.minCedrosDataVersion, '0.1.81');
  assert.equal(bootstrap.manifest.registration.server.entrypoint, 'cedros_pay::register_extension_family');
  assert.equal(bootstrap.manifest.registration.admin.entrypoint, '@cedros/pay-react/admin/register');
  assert.equal(bootstrap.manifest.registration.web.entrypoint, '@cedros/pay-react/web/register');
  assert.equal(bootstrap.manifest.registration.native.entrypoint, '@cedros/pay-react-native/register');
  assert.equal(bootstrap.manifest.packageFamily.reactNative.required, true);
  assert.equal(bootstrap.manifest.surfaces.web.required, true);
  assert.equal(bootstrap.manifest.surfaces.native.packageRef, 'reactNative');
  assert.equal(bootstrap.manifest.surfaces.native.required, true);
  assert.deepEqual(bootstrap.manifest.surfaces.native.screenIds, []);
  assert.deepEqual(bootstrap.manifest.surfaces.native.stackIds, []);
  assert.deepEqual(bootstrap.manifest.surfaces.native.providerIds, []);
  assert.deepEqual(bootstrap.manifest.setupSeeds.products, []);
  assert.ok(
    bootstrap.manifest.providerAccess.some(
      (access) =>
        access.id === 'cedros-pay:blockchain-config' &&
        access.provider === 'blockchain' &&
        access.scopes.includes('blockchain.config.read')
    )
  );
  assert.ok(
    bootstrap.manifest.providerAccess.some(
      (access) =>
        access.id === 'cedros-pay:blockchain-x402-sign' &&
        access.provider === 'blockchain' &&
        access.scopes.includes('blockchain.solana.sign.x402')
    )
  );
  assert.ok(
    !bootstrap.manifest.adminModules[0].sectionIds.includes(
      'cedros-pay:customers'
    )
  );
  assert.deepEqual(
    bootstrap.manifest.adminModules[0].sectionIds,
    ['cedros-pay:catalog', 'cedros-pay:transactions', 'cedros-pay:settings-hub']
  );
  assert.deepEqual(bootstrap.manifest.dependencies.services ?? [], []);
  assert.deepEqual(
    bootstrap.manifest.jobSchedules.map((schedule) => schedule.jobId),
    bootstrap.manifest.surfaces.server.jobs
  );
  assert.ok(
    bootstrap.manifest.jobSchedules.every((schedule) =>
      schedule.id.startsWith('cedros-pay:')
    )
  );
  assert.ok(
    bootstrap.manifest.jobSchedules.every((schedule) => schedule.maxRetries === 0)
  );
  const webhookDelivery = bootstrap.manifest.jobSchedules.find(
    (schedule) => schedule.jobId === 'cedros-pay:webhook-delivery'
  );
  assert.equal(webhookDelivery?.cron, '* * * * *');
  assert.equal(webhookDelivery?.enabled, true);
  const cleanup = bootstrap.manifest.jobSchedules.find(
    (schedule) => schedule.jobId === 'cedros-pay:cleanup'
  );
  assert.equal(cleanup?.cron, '*/5 * * * *');
  assert.equal(cleanup?.enabled, true);
  assert.deepEqual(
    bootstrap.manifest.jobSchedules
      .filter((schedule) => schedule.enabled)
      .map((schedule) => schedule.jobId),
    ['cedros-pay:cleanup', 'cedros-pay:webhook-delivery']
  );
  assert.ok(
    bootstrap.manifest.jobSchedules.every(
      (schedule) => !Object.prototype.hasOwnProperty.call(schedule, 'schedule')
    )
  );
  assert.deepEqual(
    bootstrap.manifest.jobSchedules
      .filter((schedule) => schedule.autoCreateOnEnable)
      .map((schedule) => schedule.jobId),
    ['cedros-pay:cleanup', 'cedros-pay:webhook-delivery']
  );
  assert.deepEqual(bootstrap.manifest.surfaces.web.routeIds, []);
  assert.deepEqual(bootstrap.manifest.surfaces.web.blockTypes, []);
  assert.deepEqual(bootstrap.manifest.surfaces.web.templateIds, []);
  assert.deepEqual(bootstrap.manifest.surfaces.web.authoredSurfaceIds, []);
  assert.equal(bootstrap.manifest.contentBlocks.length, 0);
  assert.equal(bootstrap.manifest.contentTemplates.length, 0);
  assert.deepEqual(bootstrap.manifest.authoredSurfaces, []);
  assert.equal(bootstrap.manifest.pageSeeds.length, 0);
  assert.equal(bootstrap.contentBlockRenderers, undefined);
  assert.equal(
    /cedros-pay:(?:payment-page|subscription-page|checkout-cta|subscription-chooser|payment-pages)/u.test(
      JSON.stringify(bootstrap)
    ),
    false
  );
  assert.ok(
    bootstrap.manifest.capabilities.some(
      (capability) => capability.id === 'cedros-pay:product-rag-records'
    )
  );
  assert.ok(
    bootstrap.manifest.capabilities.some((capability) => capability.id === 'cedros-pay:product-read')
  );
  assert.ok(
    bootstrap.manifest.capabilities.some((capability) => capability.id === 'cedros-pay:product-create')
  );
  const checkoutCapability = bootstrap.manifest.capabilities.find(
    (capability) => capability.id === 'cedros-pay:checkout'
  );
  assert.equal(Object.hasOwn(checkoutCapability ?? {}, 'registered'), false);
  assert.equal(Object.hasOwn(checkoutCapability ?? {}, 'active'), false);
  assert.deepEqual(
    checkoutCapability?.requestedScopes.map(({ verb, resource }) => ({ verb, resource })),
    [
      { verb: 'call', resource: 'cedros-pay-checkout:quote' },
      { verb: 'call', resource: 'cedros-pay-checkout:checkout' },
    ]
  );
  const cartCapability = bootstrap.manifest.capabilities.find(
    (capability) => capability.id === 'cedros-pay:versioned-cart-write-v1'
  );
  assert.equal(Object.hasOwn(cartCapability ?? {}, 'registered'), false);
  assert.equal(Object.hasOwn(cartCapability ?? {}, 'active'), false);
  assert.ok(
    bootstrap.manifest.dependencies.capabilities.some(
      (capability) =>
        capability.capabilityId === 'cedros-data:extension-storage-cas-v1' &&
        capability.required === true
    )
  );
  assert.deepEqual(
    bootstrap.manifest.requiredCapabilities,
    [
      'cedros-data:extension-storage-cas-v1',
      'cedros-data:extension-config-cas-v1',
      'cedros-data:extension-shared-cache-v1',
      'cedros-data:extension-invalidations-v1',
    ]
  );
  assert.ok(bootstrap.manifest.surfaces.server.routes.includes('cedros-pay:product-rag-records'));
  assert.ok(bootstrap.manifest.surfaces.server.routes.includes('cedros-pay:product-read'));
  assert.ok(bootstrap.manifest.surfaces.server.routes.includes('cedros-pay:product-create'));
  assert.ok(bootstrap.manifest.surfaces.server.routes.includes('cedros-pay:subscription-entitlements'));
  for (const modelId of [
    'cedros-pay:checkout-operations',
    'cedros-pay:customer-carts',
    'cedros-pay:guarded-write-policy-state',
  ]) {
    assert.ok(bootstrap.manifest.surfaces.server.contentModels.includes(modelId), modelId);
  }
  for (const routeId of [
    'cedros-pay:checkout-quote',
    'cedros-pay:checkout-create',
    'cedros-pay:checkout-return-verify',
    'cedros-pay:versioned-cart-open',
    'cedros-pay:versioned-cart-apply',
  ]) {
    assert.ok(bootstrap.manifest.surfaces.server.routes.includes(routeId), routeId);
  }
  for (const routeId of [
    'cedros-pay:admin-catalog-readiness',
    'cedros-pay:admin-catalog-export',
    'cedros-pay:admin-catalog-export-validate',
    'cedros-pay:admin-products-stripe-import-preview',
    'cedros-pay:admin-products-stripe-import',
    'cedros-pay:admin-products-stripe-sync',
    'cedros-pay:admin-product-inventory-set',
    'cedros-pay:admin-product-inventory-adjust',
  ]) {
    assert.ok(bootstrap.manifest.surfaces.server.routes.includes(routeId), routeId);
  }
  assert.deepEqual(bootstrap.manifest.adminModules, archiveManifest.adminModules);
  assert.deepEqual(archiveBootstrap.manifest, archiveManifest);
  assert.deepEqual(bootstrap.manifest, archiveManifest);
});
