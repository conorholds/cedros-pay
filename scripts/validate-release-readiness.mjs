#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { inspect } from 'node:util';
import { execSync } from 'node:child_process';
import { assert, assertEqual, readJson, root } from './lib/validation-helpers.mjs';
import { calculatePackagedInputDigest } from './lib/release-input-digest.mjs';

const allowedReleaseStatuses = new Set(['ready', 'host-coordinated', 'deferred', 'blocked', 'bound', 'metadata-only', 'not applicable']);
const allowedSupplyChainStatuses = new Set([
  'not-provided',
  'provided-unverified',
  'source-unreachable',
  'source-revision-matched',
  'signed-source-verified',
  'provenance-verified',
  'sbom-present',
  'artifact-signature-verified',
  'rebuild-matched',
  'verification-failed',
  'not-applicable',
]);
const allowedEvidenceCheckStatuses = new Set(['passed', 'failed', 'warning', 'not-run', 'not-applicable']);
const allowedArchiveEvidenceStatuses = new Set([
  'current-verified',
  'historical-superseded',
  'not-built',
]);

function assertStatus(status, label) {
  assert(allowedReleaseStatuses.has(status), `${label} has unsupported status ${inspect(status)}`);
}

function isAncestorCommit(commit, headCommit) {
  try {
    execSync(`git merge-base --is-ancestor ${commit} ${headCommit}`, { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function collectManifestIds(manifest) {
  return new Set([
    'cedros-extension.manifest.json',
    'cedros-extension.bootstrap.json',
    ...(manifest.surfaces.server.routes ?? []),
    ...(manifest.surfaces.server.jobs ?? []),
    ...(manifest.surfaces.server.migrations ?? []),
    ...(manifest.surfaces.server.settingsSchemas ?? []),
    ...(manifest.surfaces.server.contentModels ?? []),
    ...(manifest.surfaces.admin.moduleIds ?? []),
    ...(manifest.surfaces.web.routeIds ?? []),
    ...(manifest.surfaces.web.blockTypes ?? []),
    ...(manifest.surfaces.web.templateIds ?? []),
    ...(manifest.surfaces.web.authoredSurfaceIds ?? []),
    ...(manifest.surfaces.native.screenIds ?? []),
    ...(manifest.surfaces.native.stackIds ?? []),
    ...(manifest.surfaces.native.providerIds ?? []),
    ...((manifest.surfaces.ai?.skills ?? []).map((skill) => skill.id)),
    ...((manifest.surfaces.ai?.capabilities ?? []).map((capability) => capability.id)),
    ...((manifest.capabilities ?? []).map((capability) => capability.id)),
    ...((manifest.adminModules ?? []).flatMap((module) => module.contributions?.dashboardCards?.map((card) => card.id) ?? [])),
    ...((manifest.formTemplates ?? []).map((form) => form.id)),
    ...((manifest.docsArticles ?? []).map((article) => article.id)),
    ...((manifest.policies ?? []).map((policy) => policy.id)),
    ...((manifest.onboardingPages ?? []).map((page) => page.id)),
    ...((manifest.analytics?.events ?? []).map((event) => event.id)),
    ...((manifest.providerAccess ?? []).map((access) => access.id)),
    ...((manifest.databaseAccess ?? []).map((access) => access.id)),
    ...((manifest.customerTagAccess ?? []).map((access) => access.id)),
    ...((manifest.crmSourceAccess ?? []).map((access) => access.id)),
  ]);
}

function assertReadinessTable(release, knownIds) {
  const surfaces = new Set();
  for (const row of release.readinessTable ?? []) {
    assert(row.surface, 'readiness row is missing surface');
    assertStatus(row.status, `${row.surface} readiness`);
    assert(typeof row.runtimePackagePresent === 'boolean', `${row.surface} runtimePackagePresent must be boolean`);
    assert(typeof row.hostHookBound === 'boolean', `${row.surface} hostHookBound must be boolean`);
    assert(row.smokeTest && row.owner, `${row.surface} needs smokeTest and owner`);
    for (const id of row.manifestIds ?? []) {
      if (id.startsWith('cedros-pay:') || id.startsWith('cedros-extension.')) {
        assert(knownIds.has(id), `${row.surface} references unknown manifest or handoff id ${id}`);
      }
    }
    surfaces.add(row.surface);
  }
  for (const requiredSurface of ['Archive metadata', 'Admin module', 'Server routes', 'Server jobs', 'Migrations', 'Database runtime access', 'Host provider access']) {
    assert(surfaces.has(requiredSurface), `readiness table missing ${requiredSurface}`);
  }
}

function assertDoNotLaunch(release, handoff) {
  const doNotLaunch = release.doNotLaunch ?? [];
  if (release.launchGate.status !== 'ready') {
    assert(doNotLaunch.length > 0, 'doNotLaunch table is required while launch gate is blocked');
  }
  for (const item of doNotLaunch) {
    assert(item.hook && item.owner && item.launchImpact && item.nextAction, `doNotLaunch row is incomplete: ${inspect(item)}`);
    assertStatus(item.status, `${item.hook} doNotLaunch`);
  }
  const blockingRows = (handoff.items ?? []).filter((row) => row.blocking);
  if (blockingRows.length > 0) {
    assert(release.launchGate.status !== 'ready', 'launch gate cannot be ready with blocking host handoff rows');
  }
  assert(release.wasmRuntimeGate?.status, 'wasmRuntimeGate status is required');
  assertStatus(release.wasmRuntimeGate.status, 'wasm runtime gate');
}

function assertEvidenceChecks(record) {
  for (const check of record.checks ?? []) {
    assert(check.checkId && check.label && check.status && check.summary, `supply-chain check is incomplete: ${inspect(check)}`);
    assert(allowedEvidenceCheckStatuses.has(check.status), `${check.checkId} has unsupported check status ${check.status}`);
    if (check.evidenceSha256) {
      assert(/^[a-f0-9]{64}$/i.test(check.evidenceSha256), `${check.checkId} evidence SHA-256 is invalid`);
    }
  }
}

function assertSupplyChainVerification(release) {
  const verification = release.supplyChainVerification;
  assert(allowedSupplyChainStatuses.has(verification?.status), 'invalid supplyChainVerification.status');
  assert(verification.summary, 'supplyChainVerification.summary is required');
  assertEvidenceChecks(verification);
  if (verification.archiveSha256) {
    assertEqual(verification.archiveSha256, release.archive.sha256, 'supplyChainVerification archive sha256');
  }
  if (verification.status !== 'not-provided') {
    assert(verification.sourceRepositoryUrl, 'supply-chain evidence needs sourceRepositoryUrl');
    assert(/^https:\/\//.test(verification.sourceRepositoryUrl), 'sourceRepositoryUrl must be HTTPS');
    assert(/^[a-f0-9]{8,40}$/.test(verification.sourceRevision ?? ''), 'sourceRevision must be a git SHA prefix or full SHA');
    assert(verification.sourceDirectory && !verification.sourceDirectory.startsWith('/'), 'sourceDirectory must be repo-relative');
    assert(verification.archiveSha256, 'supply-chain evidence needs archiveSha256');
    assert((verification.checks ?? []).some((check) => check.checkId === 'sbom' && check.status === 'passed'), 'SBOM evidence must pass');
    assert((verification.checks ?? []).some((check) => check.checkId === 'provenance' && check.status === 'passed'), 'provenance evidence must pass');
  }
}

function assertArchiveDisposition(release) {
  const archive = release.archive;
  const handoff = release.operatorHandoff;
  const installReady = release.installGate.status === 'ready';
  assert(
    allowedArchiveEvidenceStatuses.has(archive.evidenceStatus),
    `archive has unsupported evidenceStatus ${inspect(archive.evidenceStatus)}`,
  );
  assert(typeof archive.usableForInstall === 'boolean', 'archive usableForInstall must be boolean');
  assert(
    typeof handoff?.requiresFreshBuild === 'boolean',
    'operator handoff requiresFreshBuild must be boolean',
  );

  if (installReady) {
    assertEqual(archive.evidenceStatus, 'current-verified', 'ready archive evidenceStatus');
    assertEqual(archive.usableForInstall, true, 'ready archive usableForInstall');
    assertEqual(handoff.requiresFreshBuild, false, 'ready handoff requiresFreshBuild');
    return;
  }

  assert(
    archive.evidenceStatus === 'historical-superseded' || archive.evidenceStatus === 'not-built',
    'non-ready archive evidenceStatus must be historical-superseded or not-built',
  );
  assertEqual(archive.usableForInstall, false, 'non-ready archive usableForInstall');
  assertEqual(handoff.requiresFreshBuild, true, 'non-ready handoff requiresFreshBuild');
  assert(
    /do not upload/i.test(handoff.uploadLocation ?? ''),
    'non-ready handoff must explicitly say not to upload the historical archive',
  );
  const rebuildInstructions = handoff.freshBuildInstructions ?? [];
  assert(rebuildInstructions.length > 0, 'non-ready handoff needs freshBuildInstructions');
  assert(
    rebuildInstructions.some((step) => /make cedros-package/i.test(step)),
    'non-ready handoff must rebuild with make cedros-package',
  );
  const operatorInstructions = JSON.stringify(handoff);
  assert(
    !/upload[- ]ready/i.test(operatorInstructions),
    'non-ready handoff must not claim an upload-ready archive',
  );
  assert(
    !/\b(?:use|install)\s+(?:the\s+)?(?:validated\s+)?(?:archive\s+at\s+)?artifacts\/[^" ]+\.cedros-extension\.zip/i.test(operatorInstructions),
    'non-ready handoff must not direct operators to use the historical archive',
  );
  if (archive.evidenceStatus === 'not-built') {
    assertEqual(archive.sha256, null, 'not-built archive sha256');
    assertEqual(archive.entryCount, 0, 'not-built archive entryCount');
    assertEqual(archive.zipBytes, 0, 'not-built archive zipBytes');
    assertEqual(archive.uncompressedBytes, 0, 'not-built archive uncompressedBytes');
  }
}

function assertLaunchPreflight(release) {
  const preflight = release.launchPreflight;
  assert(preflight?.status, 'launchPreflight status is required');
  assertStatus(preflight.status, 'launch preflight');
  assert((preflight.checks ?? []).length > 0, 'launchPreflight checks are required');
  for (const check of preflight.checks ?? []) {
    assert(check.checkId && check.owner && check.description && check.verification, `launch preflight row is incomplete: ${inspect(check)}`);
    assertStatus(check.status, `${check.checkId} launch preflight`);
    assert(typeof check.required === 'boolean', `${check.checkId} required must be boolean`);
    assert(typeof check.failClosed === 'boolean', `${check.checkId} failClosed must be boolean`);
  }
}

function main() {
  const sourceOnly = process.argv.includes('--source-only');
  const packagedInputDigest = calculatePackagedInputDigest(root);
  if (process.argv.includes('--print-packaged-input-digest')) {
    console.log(JSON.stringify(packagedInputDigest));
    return;
  }
  const manifest = readJson('cedros-extension.manifest.json');
  const handoff = readJson('cedros-extension.host-handoff.json');
  const release = readJson('cedros-extension.release-readiness.json');
  const releaseInputs = readJson('cedros-extension.release-inputs.json');
  const manifestIds = collectManifestIds(manifest);
  const knownIds = new Set([...manifestIds, ...((handoff.items ?? []).map((row) => row.manifestId))]);

  assertEqual(release.schemaVersion, 1, 'release schemaVersion');
  assertEqual(release.extensionId, manifest.extensionId, 'release extensionId');
  assertEqual(release.displayName, manifest.displayName, 'release displayName');
  assertEqual(release.version, manifest.version, 'release version');
  assert(!release.archive.relativePath.startsWith('/'), 'release archive path must be repo-relative');
  assert(!JSON.stringify(release).includes('/Users/'), 'release packet must not contain machine-local paths');
  if (release.archive.evidenceStatus !== 'not-built') {
    assert(/^[a-f0-9]{64}$/.test(release.archive.sha256), 'archive sha256 is invalid');
    assert(release.archive.entryCount > 0 && release.archive.zipBytes > 0, 'archive size fields are required');
  }
  assertSupplyChainVerification(release);
  assertStatus(release.installGate?.status, 'install gate');
  assertStatus(release.launchGate?.status, 'launch gate');
  assertArchiveDisposition(release);

  const headCommit = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
  const releaseCommit = String(release.releaseCommit ?? '');
  assert(/^[a-f0-9]{8,40}$/.test(releaseCommit), 'releaseCommit must be 8-40 lowercase hex characters');
  const releaseCommitIsAncestor = headCommit.startsWith(releaseCommit)
    || isAncestorCommit(releaseCommit, headCommit);
  assertEqual(releaseInputs.schemaVersion, 1, 'release inputs schemaVersion');
  assertEqual(releaseInputs.extensionId, release.extensionId, 'release inputs extensionId');
  assertEqual(releaseInputs.version, release.version, 'release inputs version');
  const reviewedSourceCommit = String(releaseInputs.reviewedSourceCommit ?? '');
  assert(
    /^[a-f0-9]{8,40}$/.test(reviewedSourceCommit),
    'reviewedSourceCommit must be 8-40 lowercase hex characters',
  );
  const reviewedSourceDigest = calculatePackagedInputDigest(root, {
    treeish: reviewedSourceCommit,
  });
  const recordedDigest = releaseInputs.packagedInputDigest;
  assert(recordedDigest?.algorithm === 'sha256', 'packagedInputDigest.algorithm must be sha256');
  assertEqual(recordedDigest.scopeVersion, packagedInputDigest.scopeVersion, 'packaged input scopeVersion');
  assertEqual(recordedDigest.fileCount, packagedInputDigest.fileCount, 'packaged input fileCount');
  assertEqual(recordedDigest.sha256, packagedInputDigest.sha256, 'packaged input digest mismatch');
  assertEqual(
    recordedDigest.fileCount,
    reviewedSourceDigest.fileCount,
    'reviewed source packaged input fileCount',
  );
  assertEqual(
    recordedDigest.sha256,
    reviewedSourceDigest.sha256,
    'reviewed source packaged input digest mismatch',
  );
  if (!releaseCommitIsAncestor) {
    console.log(
      `releaseCommit ${releaseCommit} is non-ancestor provenance; packaged inputs match reviewed source ${reviewedSourceCommit} and HEAD ${headCommit}`,
    );
  }

  if (release.installGate.status === 'ready' && !sourceOnly) {
    const archivePath = resolve(root, release.archive.relativePath);
    const archiveBytes = readFileSync(archivePath);
    const digest = createHash('sha256').update(archiveBytes).digest('hex');
    assertEqual(digest, release.archive.sha256, 'archive sha256 mismatch');
    const archiveStat = statSync(archivePath);
    assertEqual(archiveStat.size, release.archive.zipBytes, 'archive zipBytes mismatch');
  }
  assertReadinessTable(release, knownIds);
  assertDoNotLaunch(release, handoff);
  assertLaunchPreflight(release);

  for (const service of release.requiredServices ?? []) {
    assert(service.serviceId && service.owner && service.reason, `${service.serviceId} service handoff is incomplete`);
    assertStatus(service.status, `${service.serviceId} service`);
  }
  for (const contract of release.officialAndComposableContracts ?? []) {
    assert(contract.extensionId && contract.owner && contract.fallback, `${contract.extensionId} contract row is incomplete`);
    assertStatus(contract.releaseStatus, `${contract.extensionId} contract`);
  }
  for (const evidence of release.validationEvidence ?? []) {
    assert(evidence.command && evidence.environment && evidence.commit && evidence.result, `validation evidence is incomplete: ${inspect(evidence)}`);
    assert(/^passed(?:\b|[;:\s])/.test(evidence.result), `${evidence.command} did not pass`);
    assert(/^[a-f0-9]{8,40}$/.test(evidence.commit), `validation evidence commit is invalid: ${evidence.commit}`);
    const evidenceCommitIsAncestor = headCommit.startsWith(evidence.commit)
      || isAncestorCommit(evidence.commit, headCommit);
    if (release.installGate.status === 'ready' && !evidenceCommitIsAncestor) {
      console.log(
        `validation evidence commit ${evidence.commit} is non-ancestor provenance; packaged inputs match reviewed source ${reviewedSourceCommit} and HEAD ${headCommit}`,
      );
    }
  }
  assert(release.operatorHandoff?.archivePath === release.archive.relativePath, 'operator archive path must match release archive path');
  assert(release.rollbackAndDisable?.disable && release.rollbackAndDisable?.rollback, 'rollback and disable instructions are required');
  assert(release.signOff?.installGateStatus === release.installGate.status, 'signoff install gate mismatch');
  assert(release.signOff?.launchGateStatus === release.launchGate.status, 'signoff launch gate mismatch');
  console.log(
    sourceOnly
      ? 'Cedros release readiness source-only alignment passed; ready archive filesystem/hash checks were skipped.'
      : 'Cedros release readiness alignment passed.',
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
