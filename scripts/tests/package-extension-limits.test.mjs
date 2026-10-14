import assert from 'node:assert/strict';
import test from 'node:test';

import { validateArchiveSizeLimits } from '../package-extension.mjs';

test('server component uses the independent 64 MiB host bound', () => {
  const allowedSizes = new Map([
    ['cedros-extension.server.wasm', 64 * 1024 * 1024],
    ['README.md', 2 * 1024 * 1024],
  ]);
  assert.deepEqual(validateArchiveSizeLimits(allowedSizes), {
    totalBytes: 66 * 1024 * 1024,
    nonWasmBytes: 2 * 1024 * 1024,
  });

  allowedSizes.set('cedros-extension.server.wasm', 64 * 1024 * 1024 + 1);
  assert.throws(() => validateArchiveSizeLimits(allowedSizes), /exceeds 67108864 bytes/);
});

test('non-Wasm entries retain the host 2 MiB entry and 8 MiB total bounds', () => {
  assert.throws(() => validateArchiveSizeLimits(new Map([
    ['cedros-extension.server.wasm', 64 * 1024 * 1024],
    ['large.bin', 2 * 1024 * 1024 + 1],
  ])), /large\.bin exceeds 2097152 bytes/);

  const allowedSizes = new Map([['cedros-extension.server.wasm', 64 * 1024 * 1024]]);
  for (let index = 0; index < 4; index += 1) {
    allowedSizes.set(`entry-${index}.bin`, 2 * 1024 * 1024);
  }
  assert.doesNotThrow(() => validateArchiveSizeLimits(allowedSizes));
  allowedSizes.set('overflow.bin', 1);
  assert.throws(() => validateArchiveSizeLimits(allowedSizes), /non-Wasm bytes .* exceeds 8388608/);
});
