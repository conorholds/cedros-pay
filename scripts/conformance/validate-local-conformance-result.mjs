#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const FORBIDDEN_KEY = /(secret|token|credential|customer|idempotency.?key|checkout.?material|raw.?provider|url)/iu;
const FORBIDDEN_VALUE = /(https?:\/\/|bearer\s|sk_(?:live|test)_|[?&][A-Za-z0-9_.~-]+=)/iu;
const OUTCOMES = new Set(['passed', 'failed', 'unsupported']);

export function validateLocalResult(value) {
  const errors = [];
  if (!plainObject(value) || value.schemaVersion !== 1
      || value.packetType !== 'cedros-pay-shop-local-conformance'
      || value.authorization !== false || value.environmentId !== 'local-compiled-wasm-hostsim') {
    errors.push('top-level contract is invalid');
  }
  validateSubject(value?.subject, errors);
  validateCounts(value?.assertions, errors);
  if (!plainObject(value?.scenarios)
      || Object.values(value.scenarios).some((outcome) => !OUTCOMES.has(outcome))) {
    errors.push('scenario outcomes are invalid');
  }
  scan(value, [], errors);
  return errors;
}

function validateSubject(subject, errors) {
  if (!plainObject(subject)
      || !/^[a-f0-9]{40}$/.test(subject.shopSourceCommit ?? '')
      || !/^[a-f0-9]{40}$/.test(subject.shopReportCommit ?? '')
      || !/^[a-f0-9]{40}$/.test(subject.payCommit ?? '')
      || !/^[a-f0-9]{64}$/.test(subject.archiveSha256 ?? '')
      || !/^[a-f0-9]{64}$/.test(subject.wasmSha256 ?? '')
      || !/^[a-f0-9]{64}$/.test(subject.subjectSha256 ?? '')
      || subject.shopVersion !== '3.0.0') errors.push('subject is invalid');
}

function validateCounts(counts, errors) {
  if (!plainObject(counts) || !['passed', 'failed', 'unsupported', 'total'].every((key) =>
    Number.isSafeInteger(counts[key]) && counts[key] >= 0)
      || counts.total !== counts.passed + counts.failed + counts.unsupported) {
    errors.push('assertion counts are invalid');
  }
}

function scan(value, path, errors) {
  if (typeof value === 'string') {
    if (FORBIDDEN_VALUE.test(value)) errors.push(`${path.join('.')} contains sensitive content`);
    return;
  }
  if (Array.isArray(value)) return value.forEach((item, index) => scan(item, [...path, index], errors));
  if (!plainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) errors.push(`${[...path, key].join('.')} is forbidden`);
    scan(child, [...path, key], errors);
  }
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function main() {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('result path is required');
  let value;
  try { value = JSON.parse(readFileSync(path, 'utf8')); } catch { throw new Error('result is invalid'); }
  const errors = validateLocalResult(value);
  if (errors.length) throw new Error(`local result rejected: ${errors.join('; ')}`);
  console.log('Local conformance result is redacted and structurally valid.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
