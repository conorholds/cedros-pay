import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveReviewedSourceIdentity } from '../lib/supply-chain-evidence.mjs';

test('provenance resolves the immutable reviewed source instead of mutable HEAD', () => {
  const reviewed = 'a'.repeat(8);
  const resolved = 'b'.repeat(40);
  const timestamp = '2026-07-11T12:00:00-07:00';
  const calls = [];
  const identity = resolveReviewedSourceIdentity(
    { reviewedSourceCommit: reviewed },
    (args) => {
      calls.push(args);
      return args[0] === 'rev-parse' ? resolved : timestamp;
    },
  );

  assert.deepEqual(identity, { revision: resolved, timestamp });
  assert.deepEqual(calls, [
    ['rev-parse', `${reviewed}^{commit}`],
    ['show', '-s', '--format=%cI', resolved],
  ]);
});

test('provenance fails closed for invalid or unresolved reviewed source', () => {
  assert.throws(
    () => resolveReviewedSourceIdentity({}, () => ''),
    /reviewedSourceCommit must be 8-40 lowercase hex/,
  );
  assert.throws(
    () => resolveReviewedSourceIdentity(
      { reviewedSourceCommit: 'a'.repeat(8) },
      () => '',
    ),
    /could not resolve reviewed source commit/,
  );
});
