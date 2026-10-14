import { createHash } from 'node:crypto';
import { assert } from './validation-helpers.mjs';

const checksumsPath = 'workspace/supply-chain/checksums.txt';
const provenancePath = 'workspace/supply-chain/provenance.intoto.json';
const maxSubjects = 256;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function entryText(entries, path) {
  const bytes = entries.get(path);
  assert(bytes !== undefined, `supply-chain evidence is missing ${path}`);
  return Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes);
}

function verifySubject(entries, name, expected, source) {
  assert(typeof name === 'string' && name.length > 0, `${source} has an invalid subject path`);
  assert(/^[a-f0-9]{64}$/.test(expected ?? ''), `${source} has an invalid SHA-256 for ${name}`);
  const bytes = entries.get(name);
  assert(bytes !== undefined, `${source} references missing archive entry ${name}`);
  assert(sha256(bytes) === expected, `${source} SHA-256 mismatch for ${name}`);
}

function verifyChecksums(entries) {
  const lines = entryText(entries, checksumsPath).split('\n').filter(Boolean);
  assert(lines.length > 0 && lines.length <= maxSubjects,
    `${checksumsPath} must contain 1-${maxSubjects} subjects`);
  const seen = new Set();
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert(match, `${checksumsPath} contains an invalid line`);
    const [, digest, name] = match;
    assert(!seen.has(name), `${checksumsPath} contains duplicate subject ${name}`);
    seen.add(name);
    verifySubject(entries, name, digest, checksumsPath);
  }
  return lines.length;
}

function verifyProvenance(entries) {
  let provenance;
  try {
    provenance = JSON.parse(entryText(entries, provenancePath));
  } catch (cause) {
    throw new Error(`${provenancePath} is not valid JSON: ${cause.message}`);
  }
  const subjects = provenance?.subject;
  assert(Array.isArray(subjects) && subjects.length > 0 && subjects.length <= maxSubjects,
    `${provenancePath} must contain 1-${maxSubjects} subjects`);
  const seen = new Set();
  for (const subject of subjects) {
    const name = subject?.name;
    assert(!seen.has(name), `${provenancePath} contains duplicate subject ${name}`);
    seen.add(name);
    verifySubject(entries, name, subject?.digest?.sha256, provenancePath);
  }
  return subjects.length;
}

/** Verifies that packaged checksums and in-toto subjects replay against archive bytes. */
export function verifySupplyChainReplay(entries) {
  return {
    checksumSubjects: verifyChecksums(entries),
    provenanceSubjects: verifyProvenance(entries),
  };
}
