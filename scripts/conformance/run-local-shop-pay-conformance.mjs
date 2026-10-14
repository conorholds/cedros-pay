#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { runBridgeScenarios } from './local-bridge-scenarios.mjs';
import { validateLocalResult } from './validate-local-conformance-result.mjs';

const EXPECTED = {
  sourceCommit: '6f08586c8574b6f04c023b74f1f1a075f94785e7',
  reportCommit: 'ab06fa70ca8df214da97057620d1f5a7f6c0e977',
  version: '3.0.0',
  archiveSha256: '87af93c16d02f7dfafbea2b3585c72b88be02c7d195ec5c5b4c07f2202bd5f52',
  wasmSha256: '9e9532653274bb038844d6ce12b3d87493fa660b445dd414d743457415cedb99',
};

async function main() {
  const options = parse(process.argv.slice(2));
  const subject = validateShop(options.shopRoot);
  mkdirSync(options.temporary, { recursive: true });
  const scenarios = await runBridgeScenarios({ ...options, subject,
    payRoot: resolve(import.meta.dirname, '../..'),
    payWorker: resolve(import.meta.dirname, 'pay-hostsim-process-worker.mjs'),
    cartWorker: resolve(import.meta.dirname, 'cart-hostsim-process-worker.mjs'),
    now: '2026-07-11T00:00:00.000Z' });
  const flattened = flatten(scenarios);
  const result = { schemaVersion: 1, packetType: 'cedros-pay-shop-local-conformance',
    authorization: false, environmentId: 'local-compiled-wasm-hostsim',
    subject, assertions: counts(flattened), scenarios: flattened,
    limitations: ['PROVIDER_RETURN_REQUIRES_DATA_STAGING',
      'PROVIDER_TERMINAL_REQUIRES_DATA_STAGING', 'PLATFORM_CAPTURE_REQUIRES_CANONICAL_RUN',
      'SEO_DATA_ATTACH_REQUIRES_DATA_STAGING'] };
  const errors = validateLocalResult(result);
  if (errors.length) throw new Error(`local result rejected: ${errors.join('; ')}`);
  publish(options.output, result);
  console.log(`Local Pay-Shop bridge complete: ${result.assertions.passed} passed, `
    + `${result.assertions.failed} failed, ${result.assertions.unsupported} unsupported; authorization=false.`);
}

function parse(args) {
  const defaults = {
    shopRoot: undefined,
    output: resolve('.context/conformance/cedros-pay-shop-local-result.json'),
    temporary: resolve('.context/conformance/bridge-work'),
  };
  const allowed = new Map([
    ['--shop-root', 'shopRoot'], ['--output', 'output'], ['--temporary', 'temporary'],
  ]);
  if (args.length % 2 !== 0) throw new Error('arguments are invalid');
  for (let index = 0; index < args.length; index += 2) {
    const key = allowed.get(args[index]);
    if (!key || !args[index + 1]) throw new Error('arguments are invalid');
    defaults[key] = resolve(args[index + 1]);
  }
  if (!defaults.shopRoot) throw new Error('--shop-root is required');
  return defaults;
}

function validateShop(root) {
  const reportCommit = git(root, ['rev-parse', 'HEAD']);
  const sourceCommit = git(root, ['rev-parse', `${EXPECTED.sourceCommit}^{commit}`]);
  const manifest = JSON.parse(readFileSync(join(root, 'cedros-extension.manifest.json'), 'utf8'));
  const archiveSha256 = sha256(join(root, 'artifacts/cedros-shop-3.0.0.cedros-extension.zip'));
  const wasmSha256 = sha256(join(root, 'cedros-extension.server.wasm'));
  if (reportCommit !== EXPECTED.reportCommit || sourceCommit !== EXPECTED.sourceCommit
      || manifest.version !== EXPECTED.version || archiveSha256 !== EXPECTED.archiveSha256
      || wasmSha256 !== EXPECTED.wasmSha256) throw new Error('Shop source or artifact identity mismatch');
  const payCommit = git(resolve(import.meta.dirname, '../..'), ['rev-parse', 'HEAD']);
  const core = { shopSourceCommit: sourceCommit, shopReportCommit: reportCommit,
    payCommit, shopVersion: manifest.version, archiveSha256, wasmSha256 };
  return { ...core, subjectSha256: createHash('sha256').update(canonical(core)).digest('hex') };
}

function flatten(value, prefix = '', output = {}) {
  for (const [key, child] of Object.entries(value)) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') output[name] = child;
    else flatten(child, name, output);
  }
  return output;
}

function counts(scenarios) {
  const values = Object.values(scenarios);
  return { passed: values.filter((value) => value === 'passed').length,
    failed: values.filter((value) => value === 'failed').length,
    unsupported: values.filter((value) => value === 'unsupported').length,
    total: values.length };
}

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('git identity check failed');
  return result.stdout.trim();
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function canonical(value) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right))));
}

function publish(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(value)}\n`, { flag: 'wx', mode: 0o600 });
    renameSync(temporary, path);
  } catch (error) { rmSync(temporary, { force: true }); throw error; }
}

await main();
