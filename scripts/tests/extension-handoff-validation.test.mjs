import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { assertHandoffRows } from '../lib/extension-handoff-validation.mjs';

function readJson(relativePath) {
  return JSON.parse(
    readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8'),
  );
}

function fixture() {
  return {
    manifest: readJson('cedros-extension.manifest.json'),
    handoff: readJson('cedros-extension.host-handoff.json'),
  };
}

test('accepts the published Balance 0.5.0 read contract and Compliance handoff', () => {
  const { manifest, handoff } = fixture();
  assert.doesNotThrow(() => assertHandoffRows(manifest, handoff));
});

test('rejects an unversioned Cedros Balance dependency', () => {
  const { manifest, handoff } = fixture();
  delete manifest.dependencies.extensions.find(
    (dependency) => dependency.extensionId === 'cedros-balance',
  ).minVersion;

  assert.throws(
    () => assertHandoffRows(manifest, handoff),
    /Cedros Balance minimum version/,
  );
});

test('rejects an undocumented Cedros Balance mutation grant', () => {
  const { manifest, handoff } = fixture();
  manifest.dependencies.capabilities.push({
    capabilityId: 'cedros-balance:balance-credit',
    required: false,
    reason: 'not implemented',
  });

  assert.throws(
    () => assertHandoffRows(manifest, handoff),
    /Cedros Balance consumed capabilities/,
  );
});
