import { assert } from './validation-helpers.mjs';
import {
  assertGuardedBatchProvenance,
  GUARDED_MODEL_SET_SHA256,
  LEGACY_GUARDED_BATCH_CAPABILITY,
  STORAGE_CAS_CAPABILITY,
} from './guarded-batch-provenance-validation.mjs';

export { LEGACY_GUARDED_BATCH_CAPABILITY };

const CURRENT_EXTENSION_SERVICES_MIN_HOST = '0.1.81';

export const GUARDED_MODELS = [
  'cedros-pay:access-passes',
  'cedros-pay:cart',
  'cedros-pay:catalog-fence',
  'cedros-pay:checkout-inventory-holds',
  'cedros-pay:checkout-operations',
  'cedros-pay:checkout-return-index',
  'cedros-pay:checkout-stock',
  'cedros-pay:commerce-ledger',
  'cedros-pay:credits',
  'cedros-pay:customer-cart-generations',
  'cedros-pay:customer-cart-lanes',
  'cedros-pay:customer-cart-operations',
  'cedros-pay:customer-cart-tombstones',
  'cedros-pay:customer-carts',
  'cedros-pay:program-access',
  'cedros-pay:subscriptions',
  'cedros-pay:ucp-sessions',
  'cedros-pay:webhook-outbox',
];

export const CANONICAL_ROUTES = new Map([
  ['cedros-pay:checkout-descriptor', ['GET', '/checkout/descriptor']],
  ['cedros-pay:checkout-quote', ['POST', '/checkout/quote']],
  ['cedros-pay:checkout-create', ['POST', '/checkout']],
  ['cedros-pay:checkout-status', ['GET', '/checkout/{operationId}']],
  ['cedros-pay:checkout-resolve', ['POST', '/checkout/resolve']],
  ['cedros-pay:checkout-return-verify', ['POST', '/checkout/return/verify']],
  ['cedros-pay:versioned-cart-open', ['POST', '/cart/open']],
  ['cedros-pay:versioned-cart-read', ['POST', '/cart/read']],
  ['cedros-pay:versioned-cart-rotate', ['POST', '/cart/rotate']],
  ['cedros-pay:versioned-cart-apply', ['POST', '/cart/apply']],
]);

export const LEGACY_ROUTE_IDS = [
  'cedros-pay:checkout',
  'cedros-pay:paywall',
  'cedros-pay:stripe-session',
  'cedros-pay:derive-token-account',
  'cedros-pay:blockhash',
  'cedros-pay:quote',
  'cedros-pay:verify',
  'cedros-pay:cart-quote',
  'cedros-pay:cart-get',
  'cedros-pay:cart-checkout',
  'cedros-pay:cart-credits-authorize',
  'cedros-pay:credits-grant',
  'cedros-pay:credits-authorize',
  'cedros-pay:credits-hold',
  'cedros-pay:credits-release',
];

export const GUARDED_JOB_IDS = [
  'cedros-pay:cleanup',
  'cedros-pay:webhook-delivery',
  'cedros-pay:catalog-sync',
  'cedros-pay:subscription-sync',
  'cedros-pay:x402-reconcile',
];

const CONTROL_MODEL = 'cedros-pay:guarded-write-policy-state';

/** Proves Cedros Pay is wired to the JSON guarded-batch contract, not merely a capability or WIT claim. */
export function assertConditionalMutationReadiness(
  manifest,
  handoff,
  payHandlersSource,
  provenance,
  writerInventory,
) {
  assertGuardedBatchProvenance(provenance);
  assertRuntimeAdoption(payHandlersSource);
  assertManifestContract(manifest);
  assertHandoffContract(handoff);
  assertWriterInventory(writerInventory);
  assertRouteContract(manifest, handoff);
  assertJobs(manifest, handoff);
  assertNoLegacyAliases(manifest, handoff);
}

function assertRuntimeAdoption(source) {
  for (const token of [
    'fn route_discoverable(',
    'fn require_route<',
    'fn require_job<',
    'RoutePolicy::Guarded => crate::guarded_policy::require_active',
    'RoutePolicy::Retired',
    'ROUTE_GUARDED_POLICY_ENROLL',
  ]) {
    assert(source?.includes(token), `runtime guarded adoption marker is missing: ${token}`);
  }
}

function assertManifestContract(manifest) {
  assert(
    !(manifest.dependencies?.capabilities ?? []).some(
      (item) => item.capabilityId === LEGACY_GUARDED_BATCH_CAPABILITY,
    ) && !(manifest.requiredCapabilities ?? []).includes(LEGACY_GUARDED_BATCH_CAPABILITY),
    `${LEGACY_GUARDED_BATCH_CAPABILITY} is a historical implementation label, not a public capability`,
  );
  assert(
    (manifest.dependencies?.capabilities ?? []).some(
      (item) => item.capabilityId === STORAGE_CAS_CAPABILITY && item.required === true,
    ) && (manifest.requiredCapabilities ?? []).includes(STORAGE_CAS_CAPABILITY),
    `${STORAGE_CAS_CAPABILITY} must be required for guarded commerce mutations`,
  );
  assert(
    versionAtLeast(manifest.compatibility?.minCedrosDataVersion, CURRENT_EXTENSION_SERVICES_MIN_HOST),
    `guarded-only write policy requires current minCedrosDataVersion ${CURRENT_EXTENSION_SERVICES_MIN_HOST}`,
  );
  const access = (manifest.databaseAccess ?? []).find((item) => item.id === 'cedros-pay:store-db');
  const models = new Set(access?.contentModels ?? []);
  const surfaceModels = new Set(manifest.surfaces?.server?.contentModels ?? []);
  for (const model of [...GUARDED_MODELS, CONTROL_MODEL]) {
    assert(models.has(model), `databaseAccess is missing ${model}`);
    assert(surfaceModels.has(model), `server contentModels is missing ${model}`);
  }
  const scopes = new Set((access?.scopes ?? []).map((scope) => scope.verb));
  for (const scope of ['read', 'write', 'delete']) {
    assert(scopes.has(scope), `guarded database access requires ${scope} scope`);
  }
  const checkout = (manifest.capabilities ?? []).find((item) => item.id === 'cedros-pay:checkout');
  assert(checkout, 'canonical checkout capability must be declared');
  assert(
    checkout.requestedScopes?.map((scope) => scope.resource).join(',')
      === 'cedros-pay-checkout:quote,cedros-pay-checkout:checkout',
    'canonical checkout capability scopes have drifted',
  );
  const cart = (manifest.capabilities ?? []).find(
    (item) => item.id === 'cedros-pay:versioned-cart-write-v1',
  );
  assert(cart, 'versioned-cart capability must be declared');
}

function assertHandoffContract(handoff) {
  const gate = handoff.conditionalMutationGate;
  const request = gate?.requestContract;
  assert(
    gate?.requiredCapability === STORAGE_CAS_CAPABILITY
      && gate.requiredRuntime === 'Cedros Data 0.1.81 database.compare-and-set with cedros-data:extension-storage-cas-v1 and guarded-only write policy'
      && gate.minCedrosDataVersion === CURRENT_EXTENSION_SERVICES_MIN_HOST
      && gate.guardedBatchSemanticHostCommit === '6a1ddc9beb31b6ab1765777365afeb576886c758'
      && gate.requiredGuardedModelCount === 18
      && gate.requiredGuardedModelSetSha256 === GUARDED_MODEL_SET_SHA256
      && gate.activationMarker === `${CONTROL_MODEL}/active`
      && gate.enrollmentRouteId === 'cedros-pay:guarded-policy-enroll'
      && gate.writerInventory === 'docs/guarded-only-writer-inventory.json'
      && gate.eighteenModelHostEvidenceStatus === 'refresh-required-after-cedros-data-0.1.81-staging-deploy'
      && gate.fifteenModelHostEvidenceStatus === undefined
      && gate.stagingEvidenceUrl === null,
    'handoff guarded-batch runtime/provenance gate is incomplete',
  );
  assert(
    request?.schemaVersion === 1
      && request.conditionsField === 'conditions'
      && request.opsField === 'ops'
      && request.conditionLimit === 32
      && request.operationLimit === 128
      && request.predicates?.join(',') === 'absent,version'
      && request.outcomes?.join(',') === 'applied,conflict'
      && /opaque equality token/.test(request.versionSemantics ?? ''),
    'handoff JSON guarded-batch schema has drifted',
  );
}

function assertWriterInventory(inventory) {
  assert(inventory?.schemaVersion === 1, 'writer inventory schemaVersion must be 1');
  assert(inventory.modelSetSha256 === GUARDED_MODEL_SET_SHA256, 'writer inventory digest has drifted');
  assert(inventory.controlModelId === CONTROL_MODEL, 'writer inventory control model has drifted');
  assert(
    inventory.candidateModels?.map((item) => item.contentModelId).join(',')
      === GUARDED_MODELS.join(','),
    'writer inventory must contain the exact eighteen guarded models',
  );
  assert(
    inventory.candidateModels.every((item) => item.remainingUnconditionalWriters?.length === 0),
    'writer inventory still contains an unconditional guarded-model writer',
  );
  assert(
    inventory.policyActivation?.ready === true
      && inventory.policyActivation.enrollmentRouteId === 'cedros-pay:guarded-policy-enroll',
    'writer inventory enrollment lifecycle is not active',
  );
}

function assertRouteContract(manifest, handoff) {
  const routes = new Set(manifest.surfaces?.server?.routes ?? []);
  const contracts = new Map((handoff.routeContracts ?? []).map((item) => [item.routeId, item]));
  for (const [routeId, [method, path]] of CANONICAL_ROUTES) {
    assert(routes.has(routeId), `manifest is missing canonical route ${routeId}`);
    const contract = contracts.get(routeId);
    assert(contract?.methods?.join(',') === method && contract.path === path, `${routeId} contract has drifted`);
  }
  assert(routes.has('cedros-pay:guarded-policy-enroll'), 'guarded enrollment route is missing');
}

function assertJobs(manifest, handoff) {
  const jobs = new Set(manifest.surfaces?.server?.jobs ?? []);
  const contracts = new Set((handoff.jobContracts ?? []).map((item) => item.jobId));
  const schedules = new Map((manifest.jobSchedules ?? []).map((item) => [item.jobId, item]));
  for (const jobId of GUARDED_JOB_IDS) {
    assert(jobs.has(jobId) && contracts.has(jobId), `${jobId} guarded job contract is missing`);
    const expectedEnabled = [
      'cedros-pay:cleanup',
      'cedros-pay:catalog-sync',
      'cedros-pay:subscription-sync',
      'cedros-pay:webhook-delivery',
    ].includes(jobId);
    assert(
      schedules.get(jobId)?.enabled === expectedEnabled,
      `${jobId} must default ${expectedEnabled ? 'enabled' : 'disabled'}`,
    );
  }
}

function assertNoLegacyAliases(manifest, handoff) {
  const manifestRoutes = new Set(manifest.surfaces?.server?.routes ?? []);
  const handoffRoutes = new Set((handoff.routeContracts ?? []).map((item) => item.routeId));
  for (const routeId of LEGACY_ROUTE_IDS) {
    assert(!manifestRoutes.has(routeId), `legacy route revived in manifest: ${routeId}`);
    assert(!handoffRoutes.has(routeId), `legacy route revived in handoff: ${routeId}`);
  }
  const serialized = JSON.stringify({ manifest, handoff });
  assert(!/checkout-v2|\/v2(?:\/|"|$)/i.test(serialized), 'versioned checkout alias is forbidden');
}

function versionAtLeast(actual, required) {
  const parse = (value) => String(value ?? '').match(/^(\d+)\.(\d+)\.(\d+)/)?.slice(1).map(Number);
  const left = parse(actual);
  const right = parse(required);
  if (!left || !right) return false;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return true;
}
