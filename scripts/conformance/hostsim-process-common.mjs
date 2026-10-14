import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const MAX_OUTPUT = 64 * 1024;
const LOCK_TIMEOUT_MS = 45_000;
let temporarySequence = 0;

export async function withStateLock(statePath, operation) {
  mkdirSync(dirname(statePath), { recursive: true });
  const lockPath = `${statePath}.lock`;
  const lock = await acquire(lockPath);
  try { return await operation(); }
  finally { closeSync(lock); rmSync(lockPath, { force: true }); }
}

export async function invokeRoute(statePath, invocation) {
  const binary = process.env.CEDROS_PAY_PROCESS_ADAPTER_BIN
    ?? resolve(ROOT, 'server-wasm/target/debug/process_route_adapter');
  const child = spawn(binary, ['--state', statePath], { stdio: ['pipe', 'pipe', 'ignore'] });
  const result = await collect(child, JSON.stringify(invocation));
  if (result.status !== 0) throw new Error('compiled route adapter failed');
  let value;
  try { value = JSON.parse(result.stdout); } catch { throw new Error('compiled route output invalid'); }
  if (!Number.isSafeInteger(value?.status) || typeof value?.body !== 'string') {
    throw new Error('compiled route response invalid');
  }
  return value;
}

export function bridgeState(statePath) {
  const envelope = readEnvelope(statePath);
  return structuredClone(envelope.bridge);
}

export function updateBridge(statePath, update) {
  const envelope = readEnvelope(statePath);
  update(envelope.bridge);
  persist(statePath, envelope);
  return structuredClone(envelope.bridge);
}

export function fixtureResource(...parts) {
  const digest = createHash('sha256');
  digest.update('cedros-pay-local-process-bridge\0');
  for (const part of parts) {
    const value = String(part);
    digest.update(`${Buffer.byteLength(value)}:`);
    digest.update(value);
  }
  return `bridge-${digest.digest('hex')}`;
}

export function providerContext(providerScope) {
  return JSON.stringify({ siteId: fixtureResource(providerScope), environment: 'local-conformance' });
}

export function safeString(value, maximum = 256) {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum
    && !/[\u0000-\u001f\u007f]/u.test(value);
}

export function send(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

export function parsePairs(args, required) {
  if (args.length % 2 !== 0) throw new Error('arguments invalid');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!key.startsWith('--') || Object.hasOwn(values, key)) throw new Error('arguments invalid');
    values[key] = args[index + 1];
  }
  for (const key of required) if (!safeString(values[key], 4096)) throw new Error('arguments missing');
  return values;
}

async function acquire(lockPath) {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const descriptor = openSync(lockPath, 'wx', 0o600);
      writeFileSync(descriptor, `${process.pid}\n`);
      return descriptor;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      clearStaleLock(lockPath);
      await delay(5);
    }
  }
  throw new Error('state lock timeout');
}

function clearStaleLock(lockPath) {
  let pid;
  try { pid = Number(readFileSync(lockPath, 'utf8').trim()); } catch { return; }
  if (!Number.isSafeInteger(pid) || pid <= 1) return;
  try { process.kill(pid, 0); }
  catch (error) { if (error?.code === 'ESRCH') rmSync(lockPath, { force: true }); }
}

function readEnvelope(statePath) {
  let value;
  try { value = JSON.parse(readFileSync(statePath, 'utf8')); }
  catch (error) {
    if (error?.code !== 'ENOENT') throw new Error('state invalid');
    value = { schemaVersion: 1, bridge: {}, hostsim: null };
  }
  if (value?.schemaVersion !== 1 || !plainObject(value.bridge)
      || !(value.hostsim === null || plainObject(value.hostsim))) throw new Error('state invalid');
  return value;
}

function persist(statePath, value) {
  const temporary = `${statePath}.node-${process.pid}-${++temporarySequence}.tmp`;
  let descriptor;
  try {
    descriptor = openSync(temporary, 'wx', 0o600);
    writeFileSync(descriptor, JSON.stringify(value));
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, statePath);
    const directory = openSync(dirname(statePath), 'r');
    try { fsyncSync(directory); } finally { closeSync(directory); }
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    rmSync(temporary, { force: true });
    throw error;
  }
}

function collect(child, input) {
  return new Promise((resolvePromise, reject) => {
    let stdout = '';
    const timer = setTimeout(() => terminate(child, reject), 30_000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout) > MAX_OUTPUT) terminate(child, reject);
    });
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('exit', (status) => { clearTimeout(timer); resolvePromise({ status, stdout }); });
    child.stdin.end(input);
  });
}

function terminate(child, reject) {
  child.kill('SIGTERM');
  const pid = child.pid;
  setTimeout(() => { if (child.exitCode === null && child.pid === pid) child.kill('SIGKILL'); }, 200);
  reject(new Error('compiled route adapter timeout'));
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function delay(ms) { return new Promise((resolveDelay) => setTimeout(resolveDelay, ms)); }
