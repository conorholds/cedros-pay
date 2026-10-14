#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';

import {
  bridgeState, fixtureResource, invokeRoute, parsePairs, providerContext, safeString, send,
  updateBridge, withStateLock,
} from './hostsim-process-common.mjs';

const values = parsePairs(process.argv.slice(2), ['--state', '--worker-id']);
const statePath = values['--state'];
const workerId = values['--worker-id'];
if ((values['--variant'] ?? 'compliant') !== 'compliant') throw new Error('unsupported variant');

send({ type: 'handshake', protocol: 'cedros-pay-process-worker-v1', pid: process.pid,
  workerId, sharedStateId: statePath });
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
    const result = await handle(request);
    if (request.responseLoss === true) return process.exit(86);
    send({ type: 'response', id: request.id, result });
  } catch { send({ type: 'response', id: request.id, error: 'OPERATION_FAILED' }); }
}

async function handle(request) {
  if (request.action === 'describe') return descriptor(request.providerScope);
  if (request.action === 'status') return status(request);
  if (request.action === 'verifyReturn') return { status: 'mismatch' };
  if (request.action !== 'execute') throw new Error('unsupported action');
  validateExecute(request);
  return withStateLock(statePath, () => execute(request));
}

async function status(request) {
  if (!safeString(request.providerScope) || !/^payop_[a-f0-9]{64}$/.test(request.operationId ?? '')) {
    throw new Error('status request invalid');
  }
  const response = await route(request, 'cedros-pay:checkout-status', 'GET',
    `/checkout/${request.operationId}`, '', undefined, undefined);
  if (response.status !== 200) throw new Error('checkout status failed');
  return JSON.parse(response.body);
}

function descriptor(providerScope) {
  if (!safeString(providerScope)) throw new Error('provider scope invalid');
  return { protocol: 'cedros-pay-checkout', providerScope, replayTtlMs: 72 * 60 * 60 * 1000,
    acceptsExternalIdempotencyKey: true, maxIdempotencyKeyLength: 67,
    idempotencyKeyCharacterSet: 'ascii-visible',
    operationScopes: { quote: 'cedros-pay-checkout:quote', checkout: 'cedros-pay-checkout:checkout' },
    localProviderMode: 'credits-no-provider-artifact' };
}

async function execute(request) {
  if (request.operation === 'quote') {
    const quote = await createQuote(request, request.idempotencyKey);
    return { status: 'resolved', operationId: quote.operationId,
      attemptId: quote.attemptId, replayed: quote.replayed };
  }
  const quoteKey = `local-quote-${fixtureResource(
    request.providerScope, request.idempotencyKey, request.materialDigest,
  ).slice(7, 62)}`;
  const binding = fixtureResource(request.providerScope, request.idempotencyKey,
    request.materialDigest, request.attemptId);
  let quote = bridgeState(statePath).checkoutQuotes?.[binding];
  if (!quote) {
    quote = await createQuote(request, quoteKey);
    updateBridge(statePath, (bridge) => {
      bridge.checkoutQuotes ??= {};
      bridge.checkoutQuotes[binding] = { operationId: quote.operationId, attemptId: quote.attemptId };
    });
  }
  const body = JSON.stringify({ schemaVersion: 1, idempotencyKey: request.idempotencyKey,
    attemptId: request.attemptId, clientMaterialSha256: materialSha256(request),
    quoteOperationId: quote.operationId, paymentMethod: 'credits', customerContext: customerContext() });
  const response = await route(request, 'cedros-pay:checkout-create', 'POST', '/checkout', body,
    request.idempotencyKey, resource(request));
  return normalize(response);
}

async function createQuote(request, key) {
  const catalog = resource(request);
  const body = JSON.stringify({ schemaVersion: 1, idempotencyKey: key,
    attemptId: request.attemptId, clientMaterialSha256: materialSha256(request),
    source: { kind: 'items', items: [{ resource: catalog, qty: 1 }] }, customerContext: customerContext(),
    requestedPaymentMethods: ['credits'] });
  const response = await route(request, 'cedros-pay:checkout-quote', 'POST', '/checkout/quote',
    body, key, catalog);
  if (response.status !== 200) throw new Error('quote failed');
  return JSON.parse(response.body);
}

function route(request, routeId, method, path, body, idempotencyKey, catalogResource) {
  const headers = [['content-type', 'application/json'], ['authorization', 'Bearer local-session']];
  if (idempotencyKey) headers.push(['idempotency-key', idempotencyKey]);
  return invokeRoute(statePath, { now: nowSeconds(request), subject: 'local-process-subject',
    catalogResource, route: { routeId, method, path, headers, body,
      contextJson: providerContext(request.providerScope) } });
}

function normalize(response) {
  const value = JSON.parse(response.body);
  if (response.status !== 200) {
    const code = value?.error?.code;
    if (response.status === 409) return { status: 'terminal', durable: true,
      code: code === 'idempotency_mismatch' ? 'idempotency-mismatch' : code, replayed: true };
    throw new Error('checkout failed');
  }
  if (value.status === 'terminal' || value.status === 'indeterminate') return value;
  if (['paid', 'processing', 'action_required'].includes(value.status)) {
    return { status: 'resolved', operationId: value.operationId, attemptId: value.attemptId,
      returnArtifact: value.returnArtifact, replayed: value.replayed };
  }
  throw new Error('checkout outcome invalid');
}

function customerContext() {
  return { fulfillment: { kind: 'digital' }, returnUrls: {
    success: 'https://shop.example.test/checkout/success',
    cancel: 'https://shop.example.test/cart' } };
}

function resource(request) {
  return fixtureResource(request.providerScope, request.materialDigest);
}

function materialSha256(request) {
  return createHash('sha256').update(request.materialDigest).digest('hex');
}

function nowSeconds(request) {
  if (request.nowMs === undefined) return 1_783_728_000;
  if (!Number.isSafeInteger(request.nowMs) || request.nowMs < 0) throw new Error('clock invalid');
  return Math.floor(request.nowMs / 1_000);
}

function validateExecute(request) {
  if (!['quote', 'checkout'].includes(request.operation)
      || !safeString(request.providerScope) || !safeString(request.materialDigest)
      || !safeString(request.attemptId) || !safeString(request.idempotencyKey, 67)
      || ![...request.idempotencyKey].every((char) => char >= '!' && char <= '~')) {
    throw new Error('execute request invalid');
  }
}
