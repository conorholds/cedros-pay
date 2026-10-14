import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  assertConditionalMutationReadiness,
  CANONICAL_ROUTES,
  LEGACY_GUARDED_BATCH_CAPABILITY,
  LEGACY_ROUTE_IDS,
} from '../lib/conditional-mutation-validation.mjs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function fixture() {
  return {
    manifest: readJson('cedros-extension.manifest.json'),
    handoff: readJson('cedros-extension.host-handoff.json'),
    source: readFileSync('server-wasm/domain/src/conditional_mutations.rs', 'utf8'),
    provenance: readJson('docs/cedros-data-guarded-batch-provenance.json'),
    inventory: readJson('docs/guarded-only-writer-inventory.json'),
  };
}

function validate(value) {
  return assertConditionalMutationReadiness(
    value.manifest,
    value.handoff,
    value.source,
    value.provenance,
    value.inventory,
  );
}

test('accepts the complete schema-v1 JSON guarded-batch adoption', () => {
  assert.doesNotThrow(() => validate(fixture()));
});

test('rejects capability-only readiness without runtime adoption', () => {
  const value = fixture();
  value.source = '';
  assert.throws(() => validate(value), /runtime guarded adoption marker/);
});

test('rejects WIT-only readiness without JSON/runtime adoption', () => {
  const value = fixture();
  value.source = 'interface database { conditional-batch: func(); }';
  assert.throws(() => validate(value), /runtime guarded adoption marker/);
});

test('rejects the historical guarded-batch label as an invented public capability', () => {
  const value = fixture();
  value.manifest.dependencies.capabilities.push({
    capabilityId: LEGACY_GUARDED_BATCH_CAPABILITY,
    required: true,
  });
  value.manifest.requiredCapabilities.push(LEGACY_GUARDED_BATCH_CAPABILITY);
  assert.throws(() => validate(value), /historical implementation label/);
});

test('rejects guarded request schema drift and missing fields', () => {
  for (const mutation of [
    (request) => { request.schemaVersion = 2; },
    (request) => { delete request.conditionsField; },
    (request) => { request.opsField = 'operations'; },
    (request) => { request.conditionLimit = 31; },
    (request) => { request.operationLimit = 129; },
    (request) => { request.predicates = ['version']; },
    (request) => { request.outcomes = ['applied']; },
  ]) {
    const value = fixture();
    mutation(value.provenance.requestContract);
    assert.throws(() => validate(value), /JSON request\/outcome contract/);
  }
});

test('rejects non-opaque or reusable version semantics', () => {
  const value = fixture();
  value.provenance.requestContract.opaqueVersions = false;
  assert.throws(() => validate(value), /JSON request\/outcome contract/);

  const reused = fixture();
  reused.provenance.requestContract.reuseVersionAfterDeleteRecreate = true;
  assert.throws(() => validate(reused), /JSON request\/outcome contract/);
});

test('rejects provenance and guarded-model digest drift', () => {
  const commit = fixture();
  commit.provenance.hostCommit = 'ebc8a7dbbb91130fe7be911e941e2af2b44e9080';
  assert.throws(() => validate(commit), /must pin Cedros Data/);

  const digest = fixture();
  digest.inventory.modelSetSha256 = 'a'.repeat(64);
  assert.throws(() => validate(digest), /writer inventory digest/);
});

test('rejects missing models and unconditional guarded writers', () => {
  const missing = fixture();
  missing.inventory.candidateModels.pop();
  assert.throws(() => validate(missing), /exact eighteen guarded models/);

  const writer = fixture();
  writer.inventory.candidateModels[0].remainingUnconditionalWriters.push('unsafe.rs');
  assert.throws(() => validate(writer), /unconditional guarded-model writer/);
});

test('rejects incomplete marker and enrollment provenance', () => {
  const marker = fixture();
  marker.handoff.conditionalMutationGate.activationMarker = 'wrong/active';
  assert.throws(() => validate(marker), /runtime\/provenance gate/);

  const enrollment = fixture();
  enrollment.inventory.policyActivation.ready = false;
  assert.throws(() => validate(enrollment), /enrollment lifecycle/);
});

test('rejects missing canonical routes or method/path drift', () => {
  const [routeId] = CANONICAL_ROUTES.keys();
  const missing = fixture();
  missing.manifest.surfaces.server.routes = missing.manifest.surfaces.server.routes
    .filter((item) => item !== routeId);
  assert.throws(() => validate(missing), new RegExp(routeId));

  const drift = fixture();
  drift.handoff.routeContracts.find((item) => item.routeId === routeId).path = '/wrong';
  assert.throws(() => validate(drift), /contract has drifted/);
});

test('rejects every legacy route revival in manifest or handoff', () => {
  for (const routeId of LEGACY_ROUTE_IDS) {
    const manifest = fixture();
    manifest.manifest.surfaces.server.routes.push(routeId);
    assert.throws(() => validate(manifest), /legacy route revived/);

    const handoff = fixture();
    handoff.handoff.routeContracts.push({ routeId, path: '/legacy', methods: ['POST'] });
    assert.throws(() => validate(handoff), /legacy route revived/);
  }
});

test('hard rejects checkout-v2 and /v2 aliases', () => {
  const named = fixture();
  named.manifest.surfaces.server.routes.push('cedros-pay:checkout-v2');
  assert.throws(() => validate(named), /versioned checkout alias/);

  const path = fixture();
  path.handoff.routeContracts.push({ routeId: 'cedros-pay:alias', path: '/v2/checkout' });
  assert.throws(() => validate(path), /versioned checkout alias/);
});

test('requires current Data, write/delete scopes, and exact guarded job enablement', () => {
  const host = fixture();
  host.manifest.compatibility.minCedrosDataVersion = '0.1.80';
  assert.throws(() => validate(host), /minCedrosDataVersion 0\.1\.81/);

  const scope = fixture();
  scope.manifest.databaseAccess[0].scopes = [{ verb: 'read' }, { verb: 'write' }];
  assert.throws(() => validate(scope), /requires delete scope/);

  const job = fixture();
  job.manifest.jobSchedules.find((item) => item.jobId === 'cedros-pay:cleanup')
    .enabled = false;
  assert.throws(() => validate(job), /must default enabled/);

  const delivery = fixture();
  delivery.manifest.jobSchedules.find(
    (item) => item.jobId === 'cedros-pay:webhook-delivery',
  ).enabled = false;
  assert.throws(() => validate(delivery), /must default enabled/);
});
