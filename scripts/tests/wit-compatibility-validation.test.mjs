import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertManifestWitChecksum,
  sha256File,
  vendoredWitPath,
} from '../lib/wit-compatibility-validation.mjs';

test('accepts a manifest pinned to the vendored WIT', () => {
  const manifest = {
    compatibility: { witChecksum: sha256File(vendoredWitPath) },
  };

  assert.doesNotThrow(() => assertManifestWitChecksum(manifest));
});

test('rejects a manifest pinned to different WIT bytes', () => {
  const otherWit = join(tmpdir(), `cedros-pay-wit-${process.pid}.wit`);
  writeFileSync(otherWit, 'package example:wrong@1.0.0;\n');
  const manifest = {
    compatibility: { witChecksum: sha256File(vendoredWitPath) },
  };

  assert.throws(
    () => assertManifestWitChecksum(manifest, otherWit),
    /does not match vendored WIT/,
  );
});

test('canonical manifest tracks the current public host ABI and capability names', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../../cedros-extension.manifest.json', import.meta.url), 'utf8'),
  );
  const wit = readFileSync(vendoredWitPath, 'utf8');
  const dependencies = (manifest.dependencies?.capabilities ?? []).map(
    ({ capabilityId }) => capabilityId,
  );

  assert.doesNotThrow(() => assertManifestWitChecksum(manifest));
  assert.match(wit, /interface controls-privacy/);
  assert.match(wit, /compare-and-set: func/);
  assert.equal(dependencies.includes('cedros-data:database-concurrency-v1'), false);
  assert.equal(manifest.requiredCapabilities.includes('cedros-data:database-concurrency-v1'), false);
  assert.equal(dependencies.includes('cedros-data:extension-storage-cas-v1'), true);
  assert.equal(manifest.requiredCapabilities.includes('cedros-data:extension-storage-cas-v1'), true);
});
