import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { verifySupplyChainReplay } from '../lib/supply-chain-replay.mjs';

const checksumsPath = 'workspace/supply-chain/checksums.txt';
const provenancePath = 'workspace/supply-chain/provenance.intoto.json';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function fixture() {
  const entries = new Map([
    ['workspace/server/Cargo.lock', 'server lock'],
    ['workspace/server-wasm/Cargo.lock', 'Wasm lock'],
  ]);
  const subjects = [...entries].map(([name, bytes]) => ({
    name,
    digest: { sha256: sha256(bytes) },
  }));
  const provenance = `${JSON.stringify({ subject: subjects })}\n`;
  entries.set(provenancePath, provenance);
  entries.set(checksumsPath, `${[
    ...subjects.map(({ name, digest }) => `${digest.sha256}  ${name}`),
    `${sha256(provenance)}  ${provenancePath}`,
  ].join('\n')}\n`);
  return entries;
}

test('replays every checksum and in-toto subject against packaged bytes', () => {
  assert.deepEqual(verifySupplyChainReplay(fixture()), {
    checksumSubjects: 3,
    provenanceSubjects: 2,
  });
});

test('rejects a missing checksums subject', () => {
  const entries = fixture();
  entries.delete('workspace/server/Cargo.lock');
  assert.throws(
    () => verifySupplyChainReplay(entries),
    /checksums\.txt references missing archive entry workspace\/server\/Cargo\.lock/,
  );
});

test('rejects bytes that do not match checksums', () => {
  const entries = fixture();
  entries.set('workspace/server/Cargo.lock', 'tampered');
  assert.throws(
    () => verifySupplyChainReplay(entries),
    /checksums\.txt SHA-256 mismatch for workspace\/server\/Cargo\.lock/,
  );
});

test('rejects a missing in-toto subject even when checksums replay', () => {
  const entries = fixture();
  const provenance = JSON.parse(entries.get(provenancePath));
  provenance.subject.push({ name: 'missing.bin', digest: { sha256: sha256('missing') } });
  const provenanceBytes = `${JSON.stringify(provenance)}\n`;
  entries.set(provenancePath, provenanceBytes);
  const checksumLines = entries.get(checksumsPath).trimEnd().split('\n');
  checksumLines[checksumLines.length - 1] = `${sha256(provenanceBytes)}  ${provenancePath}`;
  entries.set(checksumsPath, `${checksumLines.join('\n')}\n`);

  assert.throws(
    () => verifySupplyChainReplay(entries),
    /provenance\.intoto\.json references missing archive entry missing\.bin/,
  );
});
