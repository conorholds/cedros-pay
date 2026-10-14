#!/usr/bin/env node
import { assert, assertEqual, assertNamespacedId, readJson } from './lib/validation-helpers.mjs';

function assertNamespaced(id, extensionId, label) {
  assertNamespacedId(id, extensionId, label);
}

function assertSafeKeys(keys, forbidden, label) {
  for (const key of keys) {
    for (const forbiddenKey of forbidden) {
      assert(!key.toLowerCase().includes(forbiddenKey.toLowerCase()), `${label} contains unsafe key ${key}`);
    }
  }
}

function assertReference(reference, recordId) {
  assert(reference.kind, `${recordId} reference is missing kind`);
  assert(reference.label, `${recordId} reference is missing label`);
  assert(reference.id || reference.path || reference.url, `${recordId} reference needs id, path, or url`);
  if (reference.url) {
    assert(reference.url.startsWith('https://'), `${recordId} reference urls must be approved https urls`);
  }
}

function main() {
  const manifest = readJson('cedros-extension.manifest.json');
  const automation = readJson('cedros-extension.automation.json');
  const observability = readJson('cedros-extension.site-brain.json');

  assertEqual(observability.schemaVersion, 1, 'site-brain schemaVersion');
  assertEqual(observability.extensionId, manifest.extensionId, 'site-brain extensionId');
  assertEqual(observability.version, manifest.version, 'site-brain version');
  assertEqual(observability.runtimeApiStatus?.siteBrainRecordEmit, 'published', 'site-brain emitter status');
  assertEqual(observability.runtimeApiStatus?.structuredLogHelper, 'published', 'structured log helper status');
  const capabilityScopes = new Set(
    (manifest.capabilities ?? []).flatMap((capability) =>
      (capability.requestedScopes ?? []).map((scope) => `${scope.verb}:${scope.resource}`),
    ),
  );

  const forbidden = observability.redactionPlan?.forbiddenDetailKeys ?? [];
  assert(forbidden.length > 0, 'redactionPlan.forbiddenDetailKeys is required');
  const recordIds = new Set();
  const automationSubjects = new Set((automation.siteBrainRecords ?? []).map((record) => record.subject));

  for (const record of observability.durableRecords ?? []) {
    assertNamespaced(record.recordId, manifest.extensionId, 'site-brain record id');
    assertNamespaced(record.subject, manifest.extensionId, 'site-brain subject');
    assert(!recordIds.has(record.recordId), `duplicate durable record ${record.recordId}`);
    assert(record.category && /^[a-z][a-z0-9-]*$/.test(record.category), `${record.recordId} category must be stable lowercase`);
    assert(capabilityScopes.has(`write:site-brain-record:${record.category}`), `${record.recordId} missing site-brain write capability scope`);
    assert(record.title && record.summary, `${record.recordId} needs title and summary`);
    assert((record.tags ?? []).includes(manifest.extensionId), `${record.recordId} tags must include extension id`);
    assertSafeKeys(Object.keys(record.detailsShape ?? {}), forbidden, record.recordId);
    for (const reference of record.references ?? []) {
      assertReference(reference, record.recordId);
    }
    recordIds.add(record.recordId);
  }

  for (const subject of automationSubjects) {
    assert([...recordIds].some((id) => id.includes(subject.split(':')[1]) || id === `${subject}-record`), `site-brain plan missing automation subject ${subject}`);
  }

  for (const log of observability.transientLogs ?? []) {
    assertNamespaced(log.logId, manifest.extensionId, 'transient log id');
    assert(['debug', 'info', 'warn', 'error'].includes(log.level), `${log.logId} has invalid log level`);
    assert(log.surface && log.operation, `${log.logId} needs surface and operation`);
    assert((log.fields ?? []).includes('extensionId'), `${log.logId} must include extensionId`);
    assert((log.fields ?? []).includes('cause'), `${log.logId} must include cause`);
    assertSafeKeys([...(log.fields ?? []), ...Object.keys(log.metadataShape ?? {})], forbidden, log.logId);
  }

  console.log('Cedros observability alignment passed.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
