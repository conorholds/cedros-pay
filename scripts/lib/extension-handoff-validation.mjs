import {
  assert,
  assertDeepEqual,
  assertEqual,
  assertNamespacedIds,
} from './validation-helpers.mjs';

const REQUIRED_CHECKOUT_JOB_IDS = [
  'cedros-pay:cleanup',
  'cedros-pay:catalog-sync',
  'cedros-pay:subscription-sync',
  'cedros-pay:webhook-delivery',
];

export function assertHandoffRows(manifest, handoff) {
  assertEqual(handoff.schemaVersion, 1, 'host handoff schemaVersion');
  assertEqual(handoff.extensionId, manifest.extensionId, 'host handoff extensionId');
  assertEqual(handoff.version, manifest.version, 'host handoff version');

  const allowedStatuses = new Set(handoff.statusValues ?? []);
  for (const row of handoff.items ?? []) {
    for (const field of [
      'item',
      'manifestId',
      'type',
      'runtimePackage',
      'hostHookRequired',
      'status',
      'owner',
      'launchGate',
    ]) {
      assert(row[field], `host handoff row is missing ${field}: ${JSON.stringify(row)}`);
    }
    assert(typeof row.blocking === 'boolean', `${row.manifestId} blocking must be boolean`);
    assert(allowedStatuses.has(row.status), `${row.manifestId} has unsupported handoff status ${row.status}`);
    assertNamespacedIds([row.manifestId], manifest.extensionId, 'host handoff');
  }

  assertEqual(handoff.selfServeWasm?.entrypoint, 'cedros-extension.server.wasm', 'selfServeWasm entrypoint');
  assert(handoff.selfServeWasm?.status === 'self-serve', 'host handoff must mark Wasm surfaces self-serve');

  assertPublishedDependencyContracts(manifest, handoff);
  assertRouteContracts(manifest, handoff);
  assertJobContracts(manifest, handoff);
}

function assertPublishedDependencyContracts(manifest, handoff) {
  const balance = (manifest.dependencies?.extensions ?? []).find(
    (dependency) => dependency.extensionId === 'cedros-balance',
  );
  assert(balance, 'manifest must declare the optional Cedros Balance dependency');
  assertEqual(balance.minVersion, '0.5.0', 'Cedros Balance minimum version');
  assertEqual(balance.required, false, 'Cedros Balance dependency required flag');

  const balanceCapabilities = (manifest.dependencies?.capabilities ?? [])
    .filter((dependency) => dependency.capabilityId.startsWith('cedros-balance:'));
  assertDeepEqual(
    balanceCapabilities.map((dependency) => dependency.capabilityId),
    ['cedros-balance:balance-read'],
    'Cedros Balance consumed capabilities',
  );
  assertEqual(balanceCapabilities[0].required, false, 'Cedros Balance read required flag');
  assert(
    !(manifest.requiredCapabilities ?? []).includes('cedros-balance:balance-read'),
    'optional Cedros Balance read must not be flattened into requiredCapabilities',
  );

  const compliance = (handoff.items ?? []).find(
    (row) => row.manifestId === 'cedros-pay:compliance-policy-delegation',
  );
  assert(compliance, 'host handoff must record the Cedros Compliance delegation boundary');
  assertEqual(compliance.status, 'host-hook-requested', 'Cedros Compliance handoff status');
  assertEqual(compliance.blocking, false, 'Cedros Compliance handoff blocking flag');
}

export function assertAutomationSchedules(manifest, automation) {
  assertEqual(automation.schemaVersion, 1, 'automation schemaVersion');
  assertEqual(automation.extensionId, manifest.extensionId, 'automation extensionId');
  assertEqual(automation.version, manifest.version, 'automation version');
  assert(automation.timezone, 'automation timezone is required');
  assert(automation.metadataMaxBytes > 0, 'automation metadataMaxBytes must be positive');

  const manifestJobIds = new Set(manifest.surfaces.server.jobs ?? []);
  const manifestSchedules = new Map(
    (manifest.jobSchedules ?? []).map((schedule) => [schedule.jobId, schedule]),
  );
  const scheduleJobIds = new Set();
  const enabledJobIds = new Set();
  const planJobIds = new Set((automation.jobPlans ?? []).map((plan) => plan.jobId));
  const guardedPlanIds = new Set([
    'cedros-pay:cleanup',
    'cedros-pay:catalog-sync',
    'cedros-pay:subscription-sync',
    'cedros-pay:webhook-delivery',
    'cedros-pay:x402-reconcile',
  ]);

  for (const plan of automation.jobPlans ?? []) {
    if (!guardedPlanIds.has(plan.jobId)) continue;
    assert(
      plan.activationGate?.includes('eighteen-model'),
      `${plan.jobId} plan must name the exact eighteen-model guarded set`,
    );
  }

  for (const schedule of automation.schedules ?? []) {
    assertEqual(schedule.extensionId, manifest.extensionId, `${schedule.id} extensionId`);
    assertNamespacedIds([schedule.id], manifest.extensionId, 'automation schedule');
    assert(manifestJobIds.has(schedule.jobId), `automation schedule references undeclared job ${schedule.jobId}`);
    const manifestSchedule = manifestSchedules.get(schedule.jobId);
    assert(manifestSchedule, `manifest jobSchedules missing ${schedule.jobId}`);
    assertScheduleParity(manifestSchedule, schedule);
    assert(!schedule.schedule, `${schedule.jobId} must use cron, not schedule`);
    assert(isValidFiveFieldCron(schedule.cron), `${schedule.jobId} must use a valid 5-field cron expression`);
    if (schedule.enabled) enabledJobIds.add(schedule.jobId);
    assert(schedule.timeoutSeconds >= 1 && schedule.timeoutSeconds <= 86400, `${schedule.jobId} timeoutSeconds out of range`);
    assert(
      schedule.maxRetries === 0,
      `${schedule.jobId} maxRetries must be 0 because automatic executor retries are unsupported`,
    );
    assert(['single-flight', 'per-site', 'per-account', 'concurrent'].includes(schedule.concurrency?.mode), `${schedule.jobId} has unsupported concurrency mode`);
    assert(schedule.concurrency?.scope, `${schedule.jobId} concurrency scope is required`);
    assert(schedule.idempotencyKey, `${schedule.jobId} idempotencyKey is required`);
    assert(JSON.stringify(schedule.metadata ?? {}).length <= automation.metadataMaxBytes, `${schedule.jobId} metadata exceeds size limit`);
    assert(!JSON.stringify(schedule.metadata ?? {}).match(/secret|token|password|private_key/i), `${schedule.jobId} metadata contains secret-like keys`);
    scheduleJobIds.add(schedule.jobId);
  }

  const checkoutDeclared = (manifest.capabilities ?? []).some(
    (capability) => capability.id === 'cedros-pay:checkout',
  );
  if (checkoutDeclared) {
    assertDeepEqual(
      [...enabledJobIds],
      REQUIRED_CHECKOUT_JOB_IDS,
      'default-enabled automation jobs',
      'active checkout requires cleanup, catalog sync, subscription sync, and webhook delivery enabled',
    );
  }
  const subscriptionSync = manifestSchedules.get('cedros-pay:subscription-sync');
  if (checkoutDeclared) {
    assert(
      subscriptionSync?.autoCreateOnEnable === true
        && automation.schedules?.find((schedule) => schedule.jobId === subscriptionSync.jobId)?.autoCreateOnEnable === true,
      'subscription reconciliation must be automatically provisioned on enable',
    );
  }
  const delivery = (automation.schedules ?? []).find(
    (schedule) => schedule.jobId === 'cedros-pay:webhook-delivery',
  );
  assert(
    delivery?.activationGate?.includes('guarded-write-policy-state/active'),
    'webhook delivery schedule must retain its guarded activation gate',
  );
  const cleanup = (automation.schedules ?? []).find(
    (schedule) => schedule.jobId === 'cedros-pay:cleanup',
  );
  assert(
    cleanup?.activationGate?.includes('guarded-write-policy-state/active'),
    'cleanup schedule must retain its guarded activation gate',
  );
  if (checkoutDeclared) {
    assert(
      cleanup?.cron === '*/5 * * * *',
      'active checkout requires settlement reconciliation at least every five minutes',
    );
  }
  assert(
    /pre-enrollment/i.test(cleanup?.retryBackoff ?? ''),
    'cleanup schedule must document pre-enrollment retry behavior',
  );
  assert(
    /pre-enrollment/i.test(delivery?.retryBackoff ?? ''),
    'webhook delivery schedule must document pre-enrollment retry behavior',
  );

  for (const jobId of manifestJobIds) {
    assert(scheduleJobIds.has(jobId), `automation schedule missing manifest job ${jobId}`);
    assert(planJobIds.has(jobId), `automation job plan missing manifest job ${jobId}`);
  }

  for (const record of automation.siteBrainRecords ?? []) {
    assert(manifestJobIds.has(record.subject), `site-brain record references undeclared job ${record.subject}`);
    assert(record.category && record.title, `${record.subject} site-brain record needs category and title`);
  }
}

function assertScheduleParity(manifestSchedule, automationSchedule) {
  for (const field of [
    'id',
    'jobId',
    'enabled',
    'cron',
    'timeoutSeconds',
    'maxRetries',
  ]) {
    assertEqual(
      automationSchedule[field],
      manifestSchedule[field],
      `${automationSchedule.jobId} ${field} parity`,
    );
  }
}

function assertRouteContracts(manifest, handoff) {
  const routeIds = new Set(manifest.surfaces.server.routes ?? []);
  const routeContracts = new Set();
  const routeFields = ['handlerExport', 'auth', 'permissionRequirement', 'requestSchema', 'responseSchema', 'validationRules', 'rateLimits', 'idempotencyKeyStrategy', 'webhookSignatureSource', 'analyticsSiteBrainLogs', 'routeDiscovery', 'stagingTestUrl', 'rollbackBehavior', 'launchGate', 'failureMode'];
  for (const route of handoff.routeContracts ?? []) {
    assert(routeIds.has(route.routeId), `route contract references undeclared route ${route.routeId}`);
    assert(route.path?.startsWith('/'), `${route.routeId} route handoff path must be absolute`);
    assert((route.methods ?? []).length > 0, `${route.routeId} route handoff must list methods`);
    for (const field of routeFields) assert(route[field], `${route.routeId} route handoff is missing ${field}`);
    assert((route.errorCodes ?? []).length > 0, `${route.routeId} route handoff must list errorCodes`);
    routeContracts.add(route.routeId);
  }
  for (const routeId of routeIds) {
    assert(routeContracts.has(routeId), `route contract missing ${routeId}`);
  }
}

function assertJobContracts(manifest, handoff) {
  const jobIds = new Set(manifest.surfaces.server.jobs ?? []);
  const jobContracts = new Set();
  const jobFields = ['executorExport', 'metadataSchema', 'retryBehavior', 'concurrencyBehavior', 'downstreamApis', 'failureRecords', 'disableBehavior', 'stagingVerification', 'failureMode'];
  for (const job of handoff.jobContracts ?? []) {
    assert(jobIds.has(job.jobId), `job contract references undeclared job ${job.jobId}`);
    for (const field of jobFields) assert(job[field], `${job.jobId} job handoff is missing ${field}`);
    assert((job.scheduleExamples ?? []).length > 0, `${job.jobId} job handoff must include scheduleExamples`);
    assert(job.timeoutSeconds > 0, `${job.jobId} job timeout must be positive`);
    assert(job.idempotency, `${job.jobId} job handoff must document idempotency`);
    jobContracts.add(job.jobId);
  }
  for (const jobId of jobIds) {
    assert(jobContracts.has(jobId), `job contract missing ${jobId}`);
  }
}

function isValidFiveFieldCron(expression) {
  if (typeof expression !== 'string') return false;
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  return fields.every((field) => /^[\d*/,\-]+$/.test(field));
}
