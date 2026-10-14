#!/usr/bin/env node
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import {
  bridgeState, fixtureResource, invokeRoute, parsePairs, providerContext, safeString, send,
  updateBridge, withStateLock,
} from './hostsim-process-common.mjs';

const values = parsePairs(process.argv.slice(2), ['--backend', '--worker-id']);
const statePath = join(values['--backend'], 'pay-hostsim-process-state.json');
const workerId = values['--worker-id'];
if ((values['--fault'] ?? 'none') !== 'none') throw new Error('unsupported fault');

send({ type: 'handshake', protocol: 'cedros-distributed-process-worker-v1', pid: process.pid,
  workerId, backendId: values['--backend'] });
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
let queue = Promise.resolve();
input.on('line', (line) => { queue = queue.then(() => processLine(line), () => processLine(line)); });

async function processLine(line) {
  let request;
  try { request = JSON.parse(line); } catch { return send({ type: 'response', id: null, error: 'MALFORMED' }); }
  if (request.action === 'close') {
    send({ type: 'response', id: request.id, result: { closed: true } });
    return process.nextTick(() => process.exit(0));
  }
  try {
    if (request.delayMs) await delay(request.delayMs);
    const result = await withStateLock(statePath, () => handle(request));
    send({ type: 'response', id: request.id, result });
  } catch { send({ type: 'response', id: request.id, error: 'OPERATION_FAILED' }); }
}

async function handle(request) {
  if (request.action === 'settingsRead') return settings().current;
  if (request.action === 'settingsCas') return settingsCas(request);
  if (request.action === 'cartEstablish' || request.action === 'cartSwitch') return establish(request);
  if (request.action === 'cartRotate') return cartRotate(request);
  if (request.action === 'cartRead') return cartRead();
  if (request.action === 'cartWrite') return cartWrite(request);
  throw new Error('unsupported action');
}

function settings() {
  const bridge = bridgeState(statePath);
  return bridge.settings ?? { current: { revision: 0, valueTag: 'opaque-initial' }, mutations: {} };
}

function settingsCas(request) {
  if (!safeString(request.mutationId) || !safeString(request.materialTag)
      || !safeString(request.valueTag) || !Number.isSafeInteger(request.expectedRevision)) {
    throw new Error('settings request invalid');
  }
  let result;
  updateBridge(statePath, (bridge) => {
    bridge.settings ??= { current: { revision: 0, valueTag: 'opaque-initial' }, mutations: {} };
    const prior = bridge.settings.mutations[request.mutationId];
    if (prior) {
      result = prior.materialTag === request.materialTag
        ? { outcome: 'replayed', revision: prior.revision }
        : { outcome: 'idempotency_conflict', revision: bridge.settings.current.revision };
    } else if (request.expectedRevision !== bridge.settings.current.revision) {
      result = { outcome: 'conflict', revision: bridge.settings.current.revision };
    } else {
      const revision = bridge.settings.current.revision + 1;
      bridge.settings.current = { revision, valueTag: request.valueTag };
      bridge.settings.mutations[request.mutationId] = { materialTag: request.materialTag, revision };
      result = { outcome: 'committed', revision };
    }
  });
  return result;
}

async function establish(request) {
  if (!safeString(request.customerTag) || !Number.isSafeInteger(request.generation)) {
    throw new Error('cart owner invalid');
  }
  const subject = subjectFor(request.customerTag);
  const opened = await cartRoute(subject, 'cedros-pay:versioned-cart-open', '/cart/open',
    JSON.stringify({ lane: 'default' }));
  const value = body(opened);
  if (opened.status !== 200 || !safeString(value?.generation?.generation)) throw new Error('cart open failed');
  updateBridge(statePath, (bridge) => {
    bridge.cart ??= { generations: {}, resources: {} };
    bridge.cart.activeCustomerTag = request.customerTag;
    bridge.cart.activeSubject = subject;
    bridge.cart.activeGeneration = request.generation;
    bridge.cart.generations[String(request.generation)] = value.generation.generation;
  });
  return mapSnapshot(value, bridgeState(statePath));
}

async function cartRead() {
  const bridge = bridgeState(statePath);
  const subject = bridge.cart?.activeSubject;
  if (!safeString(subject)) throw new Error('cart unavailable');
  const response = await cartRoute(subject, 'cedros-pay:versioned-cart-read', '/cart/read',
    JSON.stringify({ lane: 'default' }));
  if (response.status !== 200) throw new Error('cart read failed');
  return mapSnapshot(body(response), bridgeState(statePath));
}

async function cartRotate(request) {
  if (!Number.isSafeInteger(request.generation) || !Number.isSafeInteger(request.nextGeneration)) {
    throw new Error('cart rotation invalid');
  }
  const bridge = bridgeState(statePath);
  const subject = bridge.cart?.activeSubject;
  const expected = bridge.cart?.generations?.[String(request.generation)];
  if (!safeString(subject) || !safeString(expected)) throw new Error('cart unavailable');
  const response = await cartRoute(subject, 'cedros-pay:versioned-cart-rotate', '/cart/rotate',
    JSON.stringify({ lane: 'default', expectedGeneration: expected }));
  const value = body(response);
  if (response.status !== 200 || value.outcome !== 'rotated') throw new Error('cart rotate failed');
  updateBridge(statePath, (current) => {
    current.cart.activeGeneration = request.nextGeneration;
    current.cart.generations[String(request.nextGeneration)] = value.generation.generation;
  });
  return { outcome: 'rotated', generation: request.nextGeneration,
    version: value.authoritative.version };
}

async function cartWrite(request) {
  validateWrite(request);
  const before = bridgeState(statePath);
  const subject = before.cart?.activeSubject;
  const generation = before.cart?.generations?.[String(request.generation)] ?? 'missing-generation';
  if (!safeString(subject)) throw new Error('cart unavailable');
  const resource = fixtureResource(request.materialTag, request.valueTag);
  updateBridge(statePath, (bridge) => {
    bridge.cart.resources[resource] = request.valueTag;
  });
  const payload = { lane: 'default', generation, expectedVersion: request.expectedVersion,
    operationId: request.operationId, mutation: { kind: 'replace_snapshot',
      snapshot: { items: [{ resource, qty: 1 }] } } };
  const response = await cartRoute(subject, 'cedros-pay:versioned-cart-apply', '/cart/apply',
    JSON.stringify(payload), resource);
  if (response.status !== 200) throw new Error('cart write failed');
  return mapApply(body(response), bridgeState(statePath));
}

function cartRoute(subject, routeId, path, requestBody, catalogResource) {
  return invokeRoute(statePath, { now: 1_783_728_000, subject, catalogResource,
    route: { routeId, method: 'POST', path,
      headers: [['authorization', 'Bearer local-session']], body: requestBody,
      contextJson: providerContext('cedros-shop-local-provider') } });
}

function mapSnapshot(value, bridge) {
  return { customerTag: bridge.cart.activeCustomerTag, generation: bridge.cart.activeGeneration,
    version: value.authoritative.version, valueTag: valueTag(value.authoritative, bridge) };
}

function mapApply(value, bridge) {
  if (value.outcome === 'applied') return { outcome: 'applied', version: value.state.version };
  if (value.outcome === 'replayed') return { outcome: 'replayed', version: value.version };
  if (['conflict', 'stale_generation', 'idempotency_conflict'].includes(value.outcome)) {
    return { outcome: value.outcome, authoritative: {
      customerTag: bridge.cart.activeCustomerTag, generation: bridge.cart.activeGeneration,
      version: value.authoritative.version, valueTag: valueTag(value.authoritative, bridge) } };
  }
  throw new Error('cart outcome invalid');
}

function valueTag(authoritative, bridge) {
  const resource = authoritative?.lines?.[0]?.productId;
  return resource ? bridge.cart.resources[resource] : 'opaque-initial';
}

function body(response) { return JSON.parse(response.body); }
function subjectFor(customerTag) { return `local-${fixtureResource(customerTag).slice(7, 55)}`; }
function delay(ms) { return new Promise((resolveDelay) => setTimeout(resolveDelay, ms)); }

function validateWrite(request) {
  if (!safeString(request.operationId) || !safeString(request.materialTag)
      || !safeString(request.valueTag) || !Number.isSafeInteger(request.generation)
      || !Number.isSafeInteger(request.expectedVersion) || request.expectedVersion < 0) {
    throw new Error('cart write invalid');
  }
}
