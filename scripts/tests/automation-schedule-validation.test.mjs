import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { cloneCedrosPayJobSchedules } from '../../ui/src/extension/jobSchedules.ts';

import { assertAutomationSchedules } from '../lib/extension-handoff-validation.mjs';
import { assertSupportedJobScheduleFields } from '../lib/manifest-schedule-validation.mjs';

function readJson(relativePath) {
  return JSON.parse(
    readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8'),
  );
}

function fixture() {
  return {
    manifest: readJson('cedros-extension.manifest.json'),
    automation: readJson('cedros-extension.automation.json'),
  };
}

test('accepts cleanup and webhook delivery for active canonical checkout', () => {
  const { manifest, automation } = fixture();
  assert.doesNotThrow(() => assertAutomationSchedules(manifest, automation));
  for (const schedule of manifest.jobSchedules) {
    assert.doesNotThrow(() => assertSupportedJobScheduleFields(schedule, 'manifest'));
  }
});

test('rejects runtime-only metadata in a manifest schedule', () => {
  const { manifest } = fixture();
  const schedule = { ...manifest.jobSchedules[0], metadata: {} };
  assert.throws(
    () => assertSupportedJobScheduleFields(schedule, 'manifest'),
    /unsupported jobSchedule field metadata/,
  );
});

test('rejects automatic executor retries', () => {
  const { manifest, automation } = fixture();
  manifest.jobSchedules[0].maxRetries = 1;
  automation.schedules[0].maxRetries = 1;
  assert.throws(
    () => assertAutomationSchedules(manifest, automation),
    /maxRetries must be 0 because automatic executor retries are unsupported/,
  );
});

test('rejects default enablement of an unrelated guarded job', () => {
  const { manifest, automation } = fixture();
  for (const schedules of [manifest.jobSchedules, automation.schedules]) {
    schedules.find((schedule) => schedule.jobId === 'cedros-pay:x402-reconcile').enabled = true;
  }
  assert.throws(
    () => assertAutomationSchedules(manifest, automation),
    /active checkout requires cleanup, catalog sync, subscription sync, and webhook delivery enabled/,
  );
});

test('rejects active checkout when cleanup is disabled', () => {
  const { manifest, automation } = fixture();
  for (const schedules of [manifest.jobSchedules, automation.schedules]) {
    schedules.find((schedule) => schedule.jobId === 'cedros-pay:cleanup').enabled = false;
  }
  assert.throws(
    () => assertAutomationSchedules(manifest, automation),
    /active checkout requires cleanup, catalog sync, subscription sync, and webhook delivery enabled/,
  );
});

test('rejects an active checkout cleanup cadence slower than five minutes', () => {
  const { manifest, automation } = fixture();
  for (const schedules of [manifest.jobSchedules, automation.schedules]) {
    schedules.find((schedule) => schedule.jobId === 'cedros-pay:cleanup').cron = '0 4 * * *';
  }
  assert.throws(
    () => assertAutomationSchedules(manifest, automation),
    /settlement reconciliation at least every five minutes/,
  );
});

test('rejects stale guarded-model counts in job plans', () => {
  const { manifest, automation } = fixture();
  automation.jobPlans.find(
    (plan) => plan.jobId === 'cedros-pay:webhook-delivery',
  ).activationGate = 'Exact fifteen-model guarded-policy marker.';

  assert.throws(
    () => assertAutomationSchedules(manifest, automation),
    /exact eighteen-model guarded set/,
  );
});


test('catalog publication is automatic and cannot be silently disabled by default', () => {
  const { manifest, automation } = fixture();
  const schedule = manifest.jobSchedules.find((item) => item.jobId === 'cedros-pay:catalog-sync');
  assert.equal(schedule.enabled, true);
  assert.equal(schedule.autoCreateOnEnable, true);
  assert.equal(schedule.cron, '*/5 * * * *');
  assert.equal(schedule.maxRetries, 0);
  for (const schedules of [manifest.jobSchedules, automation.schedules]) {
    schedules.find((item) => item.jobId === schedule.jobId).enabled = false;
  }
  assert.throws(() => assertAutomationSchedules(manifest, automation), /active checkout requires cleanup, catalog sync, subscription sync, and webhook delivery enabled/);
});


test('accepted capacity purchases have automatic subscription reconciliation', () => {
  const { manifest, automation } = fixture();
  for (const schedules of [manifest.jobSchedules, automation.schedules]) {
    const schedule = schedules.find((item) => item.jobId === 'cedros-pay:subscription-sync');
    assert.equal(schedule.enabled, true);
    assert.equal(schedule.autoCreateOnEnable, true);
    assert.equal(schedule.cron, '*/15 * * * *');
    assert.equal(schedule.maxRetries, 0);
    schedule.enabled = false;
  }
  assert.throws(() => assertAutomationSchedules(manifest, automation), /subscription sync/);
});

test('rejects subscription reconciliation that is never provisioned', () => {
  for (const source of ['manifest', 'automation']) {
    const { manifest, automation } = fixture();
    const schedules = source === 'manifest' ? manifest.jobSchedules : automation.schedules;
    delete schedules.find((item) => item.jobId === 'cedros-pay:subscription-sync').autoCreateOnEnable;
    assert.throws(() => assertAutomationSchedules(manifest, automation), /automatically provisioned/);
  }
});


test('web runtime schedule declarations match the canonical archive manifest', () => {
  const { manifest } = fixture();
  assert.deepEqual(cloneCedrosPayJobSchedules(), manifest.jobSchedules);
});
