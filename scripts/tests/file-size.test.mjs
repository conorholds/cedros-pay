import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { createTempDir, output, removeTempDir, root, run } from './validation-fixtures.mjs';

const sizeScript = join(root, 'scripts/check-file-size.mjs');

function writeLines(path, count) {
  mkdirSync(dirname(path), { recursive: true });
  const contents = Array.from({ length: count }, (_, index) => `line ${index + 1}`).join('\n');
  writeFileSync(path, count === 0 ? '' : `${contents}\n`);
}

function createSizeFixture() {
  const fixture = createTempDir('cedros-file-size-');
  writeLines(join(fixture, 'server-wasm/domain/src/legacy.rs'), 550);
  writeLines(join(fixture, 'server-wasm/domain/src/within_limit.rs'), 500);
  writeLines(join(fixture, 'server-wasm/domain/tests/large_fixture.rs'), 800);
  writeLines(join(fixture, 'ui/dist/generated.js'), 800);
  const baselinePath = join(fixture, 'scripts/file-size-baseline.json');
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(
    baselinePath,
    `${JSON.stringify({ schemaVersion: 1, maxLines: 500, files: { 'server-wasm/domain/src/legacy.rs': 550 } }, null, 2)}\n`,
  );
  return { fixture, baselinePath };
}

function checkSize(fixture, baselinePath) {
  return run('node', [sizeScript, '--root', fixture, '--baseline', baselinePath], root);
}

test('accepts unchanged oversized debt and ignores tests and generated outputs', (t) => {
  const { fixture, baselinePath } = createSizeFixture();
  t.after(() => removeTempDir(fixture));
  const result = checkSize(fixture, baselinePath);
  assert.equal(result.status, 0, output(result));
});

test('rejects growth above a recorded oversized-file baseline', (t) => {
  const { fixture, baselinePath } = createSizeFixture();
  t.after(() => removeTempDir(fixture));
  writeLines(join(fixture, 'server-wasm/domain/src/legacy.rs'), 551);
  const result = checkSize(fixture, baselinePath);
  assert.notEqual(result.status, 0, 'growth of existing size debt was accepted');
  assert.match(output(result), /legacy\.rs.*550.*551|legacy\.rs.*grew/is);
});

test('rejects a new production file above 500 lines', (t) => {
  const { fixture, baselinePath } = createSizeFixture();
  t.after(() => removeTempDir(fixture));
  writeLines(join(fixture, 'server-wasm/domain/src/new_oversized.rs'), 501);
  const result = checkSize(fixture, baselinePath);
  assert.notEqual(result.status, 0, 'a new oversized production file was accepted');
  assert.match(output(result), /new_oversized\.rs.*501|new oversized/is);
});

test('counts production validators under scripts/lib', (t) => {
  const { fixture, baselinePath } = createSizeFixture();
  t.after(() => removeTempDir(fixture));
  writeLines(join(fixture, 'scripts/lib/oversized-validator.mjs'), 501);
  const result = checkSize(fixture, baselinePath);
  assert.notEqual(result.status, 0, 'scripts/lib production code was excluded');
  assert.match(output(result), /scripts\/lib\/oversized-validator\.mjs.*501|new oversized/is);
});

test('rejects a stale baseline after a file shrinks below the limit', (t) => {
  const { fixture, baselinePath } = createSizeFixture();
  t.after(() => removeTempDir(fixture));
  writeLines(join(fixture, 'server-wasm/domain/src/legacy.rs'), 499);
  const result = checkSize(fixture, baselinePath);
  assert.notEqual(result.status, 0, 'stale resolved debt was accepted');
  assert.match(output(result), /stale.*baseline.*removed|shrinking to 499/is);
});

test('rejects an oversized-file baseline that did not ratchet downward', (t) => {
  const { fixture, baselinePath } = createSizeFixture();
  t.after(() => removeTempDir(fixture));
  writeLines(join(fixture, 'server-wasm/domain/src/legacy.rs'), 525);
  const result = checkSize(fixture, baselinePath);
  assert.notEqual(result.status, 0, 'lower current debt was hidden by an old ceiling');
  assert.match(output(result), /ratchet down.*550.*525/is);
});

test('rejects a baseline entry for a removed production file', (t) => {
  const { fixture, baselinePath } = createSizeFixture();
  t.after(() => removeTempDir(fixture));
  writeFileSync(join(fixture, 'scripts/file-size-baseline.json'), `${JSON.stringify({
    schemaVersion: 1,
    maxLines: 500,
    files: { 'server-wasm/domain/src/missing.rs': 550 },
  })}\n`);
  const result = checkSize(fixture, baselinePath);
  assert.notEqual(result.status, 0, 'missing-file baseline debt was accepted');
  assert.match(output(result), /stale baseline entry.*missing/is);
});
