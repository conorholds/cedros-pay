import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parsePackageSummary,
  refreshReleaseInputs,
  updateReadableEvidence,
  updateSupplyChain,
} from '../refresh-release-package-metadata.mjs';
import {
  createReleaseFixture,
  git,
  removeTempDir,
} from './validation-fixtures.mjs';

test('refreshes release inputs from the exact committed package source', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  const head = git(fixture, 'rev-parse', 'HEAD');

  const inputs = refreshReleaseInputs(fixture, head);

  assert.equal(inputs.reviewedSourceCommit, head);
  assert.match(inputs.packagedInputDigest.sha256, /^[a-f0-9]{64}$/);
  assert.ok(inputs.packagedInputDigest.fileCount > 0);
});

test('rejects a source commit other than the exact current HEAD', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));

  assert.throws(
    () => refreshReleaseInputs(fixture, 'deadbeef'),
    /git rev-parse failed|unknown revision|bad revision|ambiguous argument/i,
  );
});

test('parses the package summary and rejects incomplete output', () => {
  assert.deepEqual(
    parsePackageSummary('entries 68, uncompressedBytes 10, nonWasmBytes 8, zipBytes 6, hostStateBytes 4'),
    {
      entryCount: 68,
      uncompressedBytes: 10,
      nonWasmBytes: 8,
      zipBytes: 6,
      hostInstalledStateBytes: 4,
    },
  );
  assert.throws(() => parsePackageSummary('archive incomplete'), /missing the archive summary/);
});

test('refreshes readable supply-chain provenance with the current evidence', () => {
  const release = {
    version: '4.0.8',
    supplyChainVerification: {
      checks: [
        { checkId: 'archive-integrity', summary: 'old', evidenceSha256: 'old' },
        { checkId: 'provenance', summary: 'old' },
        { checkId: 'packaged-inputs', summary: 'old', evidenceSha256: 'old' },
      ],
    },
  };
  const source = '1234567890abcdef1234567890abcdef12345678';

  updateSupplyChain(release, source, { sha256: 'archive-sha', entryCount: 74 }, {
    sha256: 'input-sha',
    fileCount: 665,
  });

  assert.equal(release.supplyChainVerification.sourceRevision, source);
  assert.equal(release.supplyChainVerification.archiveSha256, 'archive-sha');
  assert.match(release.supplyChainVerification.summary, /Pay 4\.0\.8 archive/);
  assert.deepEqual(release.supplyChainVerification.checks, [
    {
      checkId: 'archive-integrity',
      label: 'Pay 4.0.8 archive integrity',
      summary: 'ZIP digest, byte count, 74-entry inventory, size limits, and embedded Wasm digest match the deterministic build.',
      evidenceSha256: 'archive-sha',
    },
    { checkId: 'provenance', summary: 'Provenance binds archive subjects to immutable reviewed source 12345678.' },
    {
      checkId: 'packaged-inputs',
      summary: '665 packaged inputs match reviewed source 12345678.',
      evidenceSha256: 'input-sha',
    },
  ]);
});

test('refreshes all operator-facing archive and source instructions', () => {
  const release = {
    version: '4.0.8',
    installGate: { status: 'deferred', meaning: 'old' },
    signOff: { installGateStatus: 'deferred' },
    doNotLaunch: [{
      hook: 'Current public authoring-kit WIT alignment',
      status: 'deferred',
      launchImpact: 'old',
      nextAction: 'old',
    }],
    readinessTable: [{
      surface: 'Archive metadata',
      smokeTest: 'old',
    }],
    installEnableSmokeChecklist: [{
      step: 'Build fresh Cedros Pay artifact',
      expected: 'old',
    }],
    operatorHandoff: {
      uploadLocation: 'old',
      installSteps: ['old'],
      freshBuildInstructions: [
        'Build a fresh archive.',
      ],
    },
    knownRisksAndAcceptedGaps: [
      'The retained 4.0.26 archive is historical.',
      'Keep this risk.',
    ],
  };
  const source = '1234567890abcdef1234567890abcdef12345678';
  const archive = {
    sha256: 'archive-sha',
    zipBytes: 123,
    entryCount: 74,
    serverWasm: { sha256: 'wasm-sha' },
  };

  updateReadableEvidence(release, source, archive);

  assert.equal(
    release.readinessTable[0].smokeTest,
    'Verify ZIP SHA-256 archive-sha, 123 bytes, 74 entries, manifest/bootstrap equality, compiled admin dist, and embedded Wasm SHA-256 wasm-sha.',
  );
  assert.equal(release.readinessTable[0].status, 'ready');
  assert.equal(release.installGate.status, 'ready');
  assert.match(release.installGate.meaning, /4\.0\.8 extension archive passed/);
  assert.equal(release.signOff.installGateStatus, 'ready');
  assert.equal(release.doNotLaunch[0].status, 'host-coordinated');
  assert.match(release.doNotLaunch[0].launchImpact, /recorded 4\.0\.8 archive/);
  assert.equal(
    release.installEnableSmokeChecklist[0].expected,
    'Reviewed source 12345678 generates the recorded current-verified 4.0.8 archive; no prior archive or checksum is reused.',
  );
  assert.deepEqual(release.operatorHandoff.freshBuildInstructions, [
    'Rebuild with make cedros-package if any packaged input changes after reviewed source 12345678.',
    'Verify the recorded archive checksum before candidate installation; complete the blocked live host and joint staging gates before production activation.',
  ]);
  assert.match(release.operatorHandoff.uploadLocation, /4\.0\.8 candidate acceptance/);
  assert.equal(release.operatorHandoff.installSteps.length, 3);
  assert.deepEqual(release.knownRisksAndAcceptedGaps, ['Keep this risk.']);
});
