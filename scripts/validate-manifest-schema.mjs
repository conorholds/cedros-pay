#!/usr/bin/env node
import { assert, assertNamespacedIds, readJson } from './lib/validation-helpers.mjs';
import { assertSupportedJobScheduleFields } from './lib/manifest-schedule-validation.mjs';
import { assertManifestWitChecksum } from './lib/wit-compatibility-validation.mjs';

const supportedAdminModuleFields = new Set([
  'moduleId',
  'extensionId',
  'displayName',
  'version',
  'packageName',
  'packageSubpath',
  'description',
  'requiredServices',
  'requiredCapabilities',
  'sectionIds',
  'sectionIcons',
  'navigation',
  'slots',
  'contributions',
]);

const supportedOnboardingPageFields = new Set([
  'id',
  'displayName',
  'moduleId',
  'sectionId',
  'description',
]);

const supportedAdminContributionFields = new Set([
  'contentEditorPanels',
  'dashboardCards',
]);

const supportedCapabilityFields = new Set([
  'id',
  'displayName',
  'description',
  'category',
  'requestedScopes',
]);

const supportedContentTemplateFields = new Set([
  'id',
  'displayName',
  'description',
  'order',
  'contentTypes',
  'surfaceId',
]);

function assertSupportedFields(record, supportedFields, label) {
  for (const field of Object.keys(record ?? {})) {
    assert(supportedFields.has(field), `${label} uses unsupported field ${field}`);
  }
}

function majorVersion(version, source) {
  const match = /^(\d+)\.\d+\.\d+(?:[-+].*)?$/.exec(version ?? '');
  assert(match, `${source} must use a semver version`);
  return Number(match[1]);
}

function isValidFiveFieldCron(expression) {
  return typeof expression === 'string' && expression.trim().split(/\s+/).length === 5;
}

function assertJobSchedules(manifest, source) {
  const defaultEnabledJobIds = new Set([
    'cedros-pay:cleanup',
    'cedros-pay:catalog-sync',
    'cedros-pay:subscription-sync',
    'cedros-pay:webhook-delivery',
  ]);
  const manifestJobs = new Set(manifest.surfaces?.server?.jobs ?? []);
  const automationByJob = new Map((automation.schedules ?? []).map((item) => [item.jobId, item]));
  const scheduledJobs = new Set();
  for (const item of manifest.jobSchedules ?? []) {
    assertSupportedJobScheduleFields(item, source);
    const automationItem = automationByJob.get(item.jobId);
    assert(manifestJobs.has(item.jobId), `${source} jobSchedules references unknown job ${item.jobId}`);
    assert(automationItem, `${source} ${item.jobId} is missing from cedros-extension.automation.json`);
    assert(item.id && item.label, `${source} jobSchedule ${item.jobId} needs id and label`);
    assertNamespacedIds([item.id], manifest.extensionId, `${source} job schedule`);
    assert(!item.schedule, `${source} ${item.jobId} must use cron, not schedule`);
    assert(isValidFiveFieldCron(item.cron), `${source} ${item.jobId} must use 5-field cron`);
    assert(
      item.enabled === defaultEnabledJobIds.has(item.jobId),
      `${source} ${item.jobId} has invalid default schedule enablement`,
    );
    assert(item.timeoutSeconds >= 1 && item.timeoutSeconds <= 86400, `${source} ${item.jobId} timeout is invalid`);
    assert(
      item.maxRetries === 0,
      `${source} ${item.jobId} maxRetries must be 0 because automatic executor retries are unsupported`,
    );
    assert(item.id === automationItem.id, `${source} ${item.jobId} schedule id must match automation plan`);
    assert(item.cron === automationItem.cron, `${source} ${item.jobId} cron must match automation plan`);
    assert(item.timeoutSeconds === automationItem.timeoutSeconds, `${source} ${item.jobId} timeout must match automation plan`);
    assert(item.maxRetries === automationItem.maxRetries, `${source} ${item.jobId} retries must match automation plan`);
    assert(
      automationItem.enabled === item.enabled,
      `${source} ${item.jobId} automation enablement must match manifest`,
    );
    scheduledJobs.add(item.jobId);
  }
  for (const jobId of manifestJobs) {
    assert(scheduledJobs.has(jobId), `${source} jobSchedules missing ${jobId}`);
  }
}

function assertNativeRequirementContract(manifest, source) {
  assert(
    manifest.packageFamily?.reactNative?.required === true,
    `${source} packageFamily.reactNative must remain required for canonical Cedros extension intake.`
  );
  assert(
    manifest.surfaces?.native?.required === true,
    `${source} surfaces.native.required must stay true for local package intake.`
  );
}

const manifests = [
  ['cedros-extension.manifest.json', readJson('cedros-extension.manifest.json')],
  ['cedros-extension.bootstrap.json', readJson('cedros-extension.bootstrap.json').manifest],
];
const automation = readJson('cedros-extension.automation.json');

for (const [source, manifest] of manifests) {
  assert(
    majorVersion(manifest.version, source) >= 2,
    `${source} must be a v2+ Wasm-only extension package`
  );
  assertManifestWitChecksum(manifest);
  assert(
    manifest.registration?.server?.entrypoint === 'cedros_pay::register_extension_family',
    `${source} server registration must use cedros_pay::register_extension_family`
  );
  assert(
    !/router_with_pool|workers::/.test(JSON.stringify(manifest)),
    `${source} must not declare legacy Rust server hooks`
  );
  assert(
    (manifest.dependencies?.services ?? []).length === 0,
    `${source} must use providerAccess instead of dependencies.services for provider seams`
  );
  assertNativeRequirementContract(manifest, source);
  assert(
    manifest.surfaces?.web?.required === true,
    `${source} surfaces.web.required must stay true for local package intake.`
  );
  assertJobSchedules(manifest, source);

  for (const adminModule of manifest.adminModules ?? []) {
    assertSupportedFields(
      adminModule,
      supportedAdminModuleFields,
      `${source} adminModules[${adminModule.moduleId ?? 'unknown'}]`
    );
    assertSupportedFields(
      adminModule.contributions,
      supportedAdminContributionFields,
      `${source} adminModules[${adminModule.moduleId ?? 'unknown'}].contributions`
    );
  }

  for (const capability of manifest.capabilities ?? []) {
    assertSupportedFields(
      capability,
      supportedCapabilityFields,
      `${source} capabilities[${capability.id ?? 'unknown'}]`
    );
  }

  for (const contentTemplate of manifest.contentTemplates ?? []) {
    assertSupportedFields(
      contentTemplate,
      supportedContentTemplateFields,
      `${source} contentTemplates[${contentTemplate.id ?? 'unknown'}]`
    );
  }

  assert(!manifest.onboarding?.pages, `${source} must use onboardingPages[], not onboarding.pages`);
  for (const onboardingPage of manifest.onboardingPages ?? []) {
    assertSupportedFields(
      onboardingPage,
      supportedOnboardingPageFields,
      `${source} onboardingPages[${onboardingPage.id ?? 'unknown'}]`
    );
  }
}

console.log('Cedros manifest schema field alignment passed.');
