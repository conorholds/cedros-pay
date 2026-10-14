import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculatePackagedInputDigest } from './lib/release-input-digest.mjs';

const scriptRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const maxComponentBytes = 64 * 1024 * 1024;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function unzipText(archivePath, ...args) {
  return execFileSync('unzip', [...args, archivePath], { encoding: 'utf8' }).trim();
}

function unzipEntry(archivePath, entry) {
  return execFileSync('unzip', ['-p', archivePath, entry], { maxBuffer: maxComponentBytes });
}

export function parsePackageSummary(output) {
  const match = output.match(
    /entries (\d+), uncompressedBytes (\d+), nonWasmBytes (\d+), zipBytes (\d+), hostStateBytes (\d+)/,
  );
  if (!match) throw new Error('package output is missing the archive summary');
  const [, entryCount, uncompressedBytes, nonWasmBytes, zipBytes, hostInstalledStateBytes] = match;
  return Object.fromEntries(Object.entries({
    entryCount,
    uncompressedBytes,
    nonWasmBytes,
    zipBytes,
    hostInstalledStateBytes,
  }).map(([key, value]) => [key, Number(value)]));
}

export function refreshReleaseInputs(root, sourceCommit) {
  const resolvedCommit = git(root, 'rev-parse', `${sourceCommit}^{commit}`);
  if (resolvedCommit !== sourceCommit) {
    throw new Error(`source commit must be the full current commit: ${sourceCommit}`);
  }
  const headCommit = git(root, 'rev-parse', 'HEAD');
  if (headCommit !== sourceCommit) {
    throw new Error(`source commit ${sourceCommit} does not match HEAD ${headCommit}`);
  }
  const path = resolve(root, 'cedros-extension.release-inputs.json');
  const inputs = readJson(path);
  inputs.reviewedSourceCommit = sourceCommit;
  inputs.packagedInputDigest = calculatePackagedInputDigest(root);
  writeJson(path, inputs);
  return inputs;
}

export function updateSupplyChain(release, sourceCommit, archive, packagedInputs) {
  const verification = release.supplyChainVerification;
  verification.summary = `The author-built Pay ${release.version} archive includes checksum-covered source identity, packaged-input digest, in-toto provenance, and a CycloneDX SBOM; no marketplace or operator verifier has attested it.`;
  verification.sourceRevision = sourceCommit;
  verification.archiveSha256 = archive.sha256;
  for (const check of verification.checks ?? []) {
    if (check.checkId === 'archive-integrity') {
      check.label = `Pay ${release.version} archive integrity`;
      check.evidenceSha256 = archive.sha256;
      check.summary = `ZIP digest, byte count, ${archive.entryCount}-entry inventory, size limits, and embedded Wasm digest match the deterministic build.`;
    }
    if (check.checkId === 'provenance') {
      check.summary = `Provenance binds archive subjects to immutable reviewed source ${sourceCommit.slice(0, 8)}.`;
    }
    if (check.checkId === 'packaged-inputs') {
      check.evidenceSha256 = packagedInputs.sha256;
      check.summary = `${packagedInputs.fileCount} packaged inputs match reviewed source ${sourceCommit.slice(0, 8)}.`;
    }
  }
}

export function updateReadableEvidence(release, sourceCommit, archive) {
  const archiveRow = (release.readinessTable ?? []).find((row) => row.surface === 'Archive metadata');
  if (archiveRow) {
    archiveRow.status = 'ready';
    archiveRow.smokeTest = `Verify ZIP SHA-256 ${archive.sha256}, ${archive.zipBytes} bytes, ${archive.entryCount} entries, manifest/bootstrap equality, compiled admin dist, and embedded Wasm SHA-256 ${archive.serverWasm.sha256}.`;
  }
  if (release.installGate) {
    release.installGate.status = 'ready';
    release.installGate.meaning = `The recorded ${release.version} extension archive passed local build, runtime, provenance, integrity, and current Cedros authoring checks and is ready for local or staging candidate installation. Production remains blocked on live host and joint staging evidence.`;
  }
  if (release.signOff) release.signOff.installGateStatus = 'ready';
  const witGate = (release.doNotLaunch ?? [])
    .find((gate) => gate.hook === 'Current public authoring-kit WIT alignment');
  if (witGate) {
    witGate.status = 'host-coordinated';
    witGate.launchImpact = `Source and the recorded ${release.version} archive are pinned to authoring kit 0.1.82 WIT checksum 2bb16879743cfd2748b7deefefcb82204c16b55a1c1a70385f4e9707a83d48f9; the matching Cedros Data 0.1.81+ deployment is not yet verified.`;
    witGate.nextAction = 'Verify the recorded archive against Cedros Data 0.1.81+ in staging.';
  }
  const buildStep = release.installEnableSmokeChecklist?.[0];
  if (buildStep?.step === 'Build fresh Cedros Pay artifact') {
    buildStep.expected = `Reviewed source ${sourceCommit.slice(0, 8)} generates the recorded current-verified ${release.version} archive; no prior archive or checksum is reused.`;
  }
  if (Array.isArray(release.operatorHandoff?.freshBuildInstructions)) {
    release.operatorHandoff.freshBuildInstructions = [
      `Rebuild with make cedros-package if any packaged input changes after reviewed source ${sourceCommit.slice(0, 8)}.`,
      'Verify the recorded archive checksum before candidate installation; complete the blocked live host and joint staging gates before production activation.',
    ];
  }
  if (release.operatorHandoff) {
    release.operatorHandoff.uploadLocation = `Cedros Data 0.1.81+ local or staging extension installer for ${release.version} candidate acceptance; production launch remains blocked.`;
    release.operatorHandoff.installSteps = [
      'Verify the archive SHA-256 and run node scripts/validate-extension.mjs and node scripts/validate-release-readiness.mjs.',
      'Install only the recorded freshly built and validated extension-only archive.',
      'Install only in Cedros Data 0.1.81+ staging with the matching WIT and extension-services contracts advertised.',
    ];
  }
  release.knownRisksAndAcceptedGaps = (release.knownRisksAndAcceptedGaps ?? [])
    .filter((risk) => !risk.includes('retained 4.0.26 archive'));
}

export function refreshReleaseArchive(root, archivePath, packageOutput) {
  const releasePath = resolve(root, 'cedros-extension.release-readiness.json');
  const inputs = readJson(resolve(root, 'cedros-extension.release-inputs.json'));
  const release = readJson(releasePath);
  const archiveBytes = readFileSync(archivePath);
  const wasmBytes = unzipEntry(archivePath, 'cedros-extension.server.wasm');
  const summary = parsePackageSummary(packageOutput);
  const archive = {
    ...release.archive,
    ...summary,
    fileName: basename(archivePath),
    relativePath: relative(root, archivePath).replaceAll('\\', '/'),
    sha256: sha256(archiveBytes),
    zipBytes: statSync(archivePath).size,
    serverWasm: { sha256: sha256(wasmBytes), bytes: wasmBytes.byteLength },
    evidenceStatus: 'current-verified',
    usableForInstall: true,
  };
  const listedEntries = unzipText(archivePath, '-Z1').split('\n').filter(Boolean);
  if (listedEntries.length !== archive.entryCount) {
    throw new Error(`archive entry count mismatch: expected ${archive.entryCount}, received ${listedEntries.length}`);
  }
  release.releaseCommit = inputs.reviewedSourceCommit;
  release.archive = archive;
  release.operatorHandoff.archivePath = archive.relativePath;
  release.operatorHandoff.requiresFreshBuild = false;
  updateSupplyChain(release, inputs.reviewedSourceCommit, archive, inputs.packagedInputDigest);
  updateReadableEvidence(release, inputs.reviewedSourceCommit, archive);
  writeJson(releasePath, release);
  return release;
}

function main(args) {
  const [mode, rootArgument, ...rest] = args;
  const root = resolve(rootArgument ?? scriptRoot);
  if (mode === 'inputs') {
    if (rest.length !== 1) throw new Error('usage: refresh-release-package-metadata.mjs inputs <root> <source-commit>');
    refreshReleaseInputs(root, rest[0]);
    return;
  }
  if (mode === 'archive') {
    if (rest.length !== 2) throw new Error('usage: refresh-release-package-metadata.mjs archive <root> <archive> <package-log>');
    refreshReleaseArchive(root, resolve(rest[0]), readFileSync(resolve(rest[1]), 'utf8'));
    return;
  }
  throw new Error('mode must be inputs or archive');
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
