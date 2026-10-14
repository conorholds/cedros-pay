#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateRustAuditReport } from './lib/rust-audit-validation.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const inputIndex = process.argv.indexOf('--input');
let raw;
let auditStatus = 0;

if (inputIndex >= 0) {
  const input = process.argv[inputIndex + 1];
  if (!input) throw new Error('--input requires a JSON path');
  raw = readFileSync(resolve(input), 'utf8');
} else {
  const audit = spawnSync('cargo', ['audit', '--json'], {
    cwd: resolve(root, 'server-wasm'),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (audit.error) throw audit.error;
  raw = audit.stdout;
  auditStatus = audit.status ?? 1;
  if (!raw.trim()) throw new Error(audit.stderr.trim() || 'cargo audit produced no JSON');
}

try {
  const allowedWarnings = validateRustAuditReport(JSON.parse(raw));
  for (const warning of allowedWarnings) console.warn(`Allowed RustSec warning: ${warning}`);
  if (auditStatus !== 0) throw new Error(`cargo audit exited with status ${auditStatus}`);
  console.log(`Rust audit passed (${allowedWarnings.length} documented warning(s)).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
