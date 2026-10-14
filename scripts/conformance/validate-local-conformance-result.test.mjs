import assert from 'node:assert/strict';
import test from 'node:test';

import { validateLocalResult } from './validate-local-conformance-result.mjs';

function valid() {
  return { schemaVersion: 1, packetType: 'cedros-pay-shop-local-conformance',
    authorization: false, environmentId: 'local-compiled-wasm-hostsim',
    subject: { shopSourceCommit: 'a'.repeat(40), shopReportCommit: 'b'.repeat(40),
      payCommit: 'c'.repeat(40), shopVersion: '3.0.0', archiveSha256: 'd'.repeat(64),
      wasmSha256: 'e'.repeat(64), subjectSha256: 'f'.repeat(64) },
    assertions: { passed: 2, failed: 1, unsupported: 1, total: 4 },
    scenarios: { cartReplay: 'passed', providerReturnCorrelation: 'unsupported' } };
}

test('accepts the exact redacted non-authorizing contract', () => {
  assert.deepEqual(validateLocalResult(valid()), []);
});

for (const [name, mutate] of [
  ['authorization', (value) => { value.authorization = true; }],
  ['sensitive key', (value) => { value.providerToken = 'redacted'; }],
  ['query URL', (value) => { value.note = 'https://example.invalid/run?id=1'; }],
  ['provider key marker', (value) => { value.note = `sk_${'test'}_fixture`; }],
  ['count mismatch', (value) => { value.assertions.total += 1; }],
]) {
  test(`rejects ${name}`, () => {
    const value = valid();
    mutate(value);
    assert.notEqual(validateLocalResult(value).length, 0);
  });
}
