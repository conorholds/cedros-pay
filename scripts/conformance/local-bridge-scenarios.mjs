import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const KEY_PREFIX = 'cedros-shop-checkout-id-';

export async function runBridgeScenarios(options) {
  const cart = await runCartHarness(options);
  const checkout = await runCheckoutSubset(options);
  return { cart, checkout, seo: { localFixture: runSeoFixture(options), dataAttach: 'unsupported' } };
}

async function runCartHarness(options) {
  const runtimeModule = await import(pathToFileURL(join(options.shopRoot,
    'scripts/conformance/distributed-process-runtime.mjs')));
  const scenarioModule = await import(pathToFileURL(join(options.shopRoot,
    'scripts/conformance/distributed-process-scenarios.mjs')));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  const runtime = new runtimeModule.DistributedProcessRuntime({ worker: options.cartWorker,
    backend: join(options.temporary, 'cart-backend'), fault: 'none', signal: controller.signal });
  try {
    await runtime.start();
    await scenarioModule.runDistributedProcessScenarios(runtime);
    const rotated = await runtime.request('a', 'cartRotate', { generation: 11, nextGeneration: 12 });
    if (rotated?.outcome !== 'rotated' || rotated.generation !== 12) {
      throw new Error('production cart rotate route failed');
    }
  } finally {
    clearTimeout(timer);
    await runtime.shutdown(controller.signal.aborted);
  }
  return { processAtomicity: 'passed', crossDeviceReplay: 'passed', staleGeneration: 'passed',
    cartRotate: 'passed', scopeIsolation: 'unsupported' };
}

async function runCheckoutSubset(options) {
  const module = await import(pathToFileURL(join(options.shopRoot,
    'scripts/conformance/pay-process-runtime.mjs')));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  const runtime = new module.PayProcessRuntime({ worker: options.payWorker,
    state: join(options.temporary, 'checkout-state.json'), variant: 'compliant',
    signal: controller.signal });
  const checks = {};
  try {
    await runtime.start();
    const descriptor = await runtime.request('a', 'describe', { providerScope: 'merchant-a-local' });
    checks.descriptor = descriptor?.protocol === 'cedros-pay-checkout'
      && descriptor.maxIdempotencyKeyLength === 67;
    const concurrency = await concurrent(runtime, descriptor);
    checks.concurrentReplay = concurrency.passed;
    const status = await runtime.request('a', 'status', { providerScope: 'merchant-a-local',
      operationId: concurrency.operationId });
    checks.statusRoute = status?.status === 'paid';
    checks.changedInputRejected = await mismatch(runtime, descriptor);
    checks.responseLossRestart = await responseLoss(runtime, descriptor);
    checks.providerIsolation = await providerIsolation(runtime, descriptor);
    checks.replayAt72Hours = await retentionBoundary(runtime, descriptor);
  } finally {
    clearTimeout(timer);
    await runtime.shutdown(controller.signal.aborted);
  }
  return {
    descriptor: outcome(checks.descriptor),
    concurrentReplay: outcome(checks.concurrentReplay),
    statusRoute: outcome(checks.statusRoute),
    changedInputRejected: outcome(checks.changedInputRejected),
    responseLossRestart: outcome(checks.responseLossRestart),
    providerIsolation: outcome(checks.providerIsolation),
    replayAt72Hours: outcome(checks.replayAt72Hours),
    providerReturnCorrelation: 'unsupported',
    providerResolve: 'unsupported',
    durableProviderTerminal: 'unsupported',
    webNativeCapture: 'unsupported',
  };
}

async function concurrent(runtime, descriptor) {
  const request = checkout(descriptor, 'A'.repeat(43), 'concurrent', 'attempt-concurrent');
  const values = await Promise.all([
    runtime.request('a', 'execute', request), runtime.request('b', 'execute', request),
  ]);
  const passed = values.every((value) => value?.status === 'resolved')
    && values[0].operationId === values[1].operationId
    && values.some((value) => value.replayed === true);
  return { passed, operationId: values[0]?.operationId };
}

async function mismatch(runtime, descriptor) {
  const request = checkout(descriptor, 'B'.repeat(43), 'material-a', 'attempt-mismatch');
  await runtime.request('a', 'execute', request);
  const changed = await runtime.request('b', 'execute', { ...request, materialDigest: 'material-b' });
  return changed?.status === 'terminal' && changed.code === 'idempotency-mismatch';
}

async function responseLoss(runtime, descriptor) {
  const request = checkout(descriptor, 'C'.repeat(43), 'response-loss', 'attempt-loss');
  await runtime.expectResponseLoss('a', { ...request, responseLoss: true });
  await runtime.restartAfterLoss('a');
  const replay = await runtime.request('a', 'execute', request);
  return replay?.status === 'resolved' && replay.replayed === true;
}

async function providerIsolation(runtime, descriptor) {
  const suffix = 'D'.repeat(43);
  const first = checkout(descriptor, suffix, 'isolated', 'attempt-a', 'merchant-a-local');
  const second = checkout(descriptor, suffix, 'isolated', 'attempt-b', 'merchant-b-local');
  const values = await Promise.all([
    runtime.request('a', 'execute', first), runtime.request('b', 'execute', second),
  ]);
  return values.every((value) => value?.status === 'resolved')
    && values[0].operationId !== values[1].operationId;
}

async function retentionBoundary(runtime, descriptor) {
  const request = checkout(descriptor, 'E'.repeat(43), 'retention', 'attempt-retention');
  try {
    const first = await runtime.request('a', 'execute', { ...request, nowMs: 1_000 });
    const replay = await runtime.request('b', 'execute', {
      ...request, nowMs: 1_000 + 72 * 60 * 60 * 1_000,
    });
    return first?.operationId === replay?.operationId && replay?.replayed === true;
  } catch { return false; }
}

function checkout(descriptor, suffix, materialDigest, attemptId, providerScope = 'merchant-a-local') {
  const idempotencyKey = `${KEY_PREFIX}${suffix}`;
  if (idempotencyKey.length !== 67) throw new Error('checkout key fixture invalid');
  return { providerScope, operation: 'checkout', operationScope: descriptor.operationScopes.checkout,
    idempotencyKey, materialDigest, attemptId };
}

function outcome(value) { return value === true ? 'passed' : 'failed'; }

function runSeoFixture(options) {
  const commands = [
    ['cargo', ['test', '-p', 'cedros-pay-extension-domain', 'seo_categories'],
      join(options.payRoot, 'server-wasm')],
    ['cargo', ['test', '--manifest-path', 'server/Cargo.toml', 'seo_category'], options.shopRoot],
    ['node', ['scripts/validate-category-seo-snapshot-contract.mjs'], options.shopRoot],
  ];
  return commands.every(([command, args, cwd]) =>
    spawnSync(command, args, { cwd, stdio: 'ignore' }).status === 0) ? 'passed' : 'failed';
}
