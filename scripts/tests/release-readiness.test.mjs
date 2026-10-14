import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';
import {
  commitAll,
  createReleaseFixture,
  git,
  output,
  pointReleaseAt,
  removeTempDir,
  releaseJson,
  root,
  run,
  validateRelease,
  writeReleaseJson,
} from './validation-fixtures.mjs';

const readyArchive = Buffer.from('deterministic ready archive fixture');

function markReadyWithoutArchive(fixture) {
  const evidenceCommit = git(fixture, 'rev-parse', 'HEAD');
  pointReleaseAt(fixture, evidenceCommit);
  const { path, value } = releaseJson(fixture);
  const digest = createHash('sha256').update(readyArchive).digest('hex');
  value.releaseCommit = evidenceCommit;
  value.installGate.status = 'ready';
  value.signOff.installGateStatus = 'ready';
  value.archive.evidenceStatus = 'current-verified';
  value.archive.usableForInstall = true;
  value.archive.sha256 = digest;
  value.archive.entryCount = 1;
  value.archive.zipBytes = readyArchive.length;
  value.archive.uncompressedBytes = readyArchive.length;
  value.supplyChainVerification.archiveSha256 = digest;
  value.operatorHandoff.requiresFreshBuild = false;
  for (const evidence of value.validationEvidence) evidence.commit = evidenceCommit;
  writeReleaseJson(path, value);
  commitAll(fixture, 'record ready archive metadata without binary');
  return join(fixture, value.archive.relativePath);
}

test('full validation rejects ready metadata when the ignored archive is absent', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  markReadyWithoutArchive(fixture);

  const result = validateRelease(fixture);
  assert.notEqual(result.status, 0, 'full validation accepted a missing ready archive');
  assert.match(output(result), /ENOENT|no such file/i);
});

test('source-only validation skips only ready archive filesystem checks', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  markReadyWithoutArchive(fixture);

  const sourceOnly = validateRelease(fixture, ['--source-only']);
  assert.equal(sourceOnly.status, 0, output(sourceOnly));
  assert.match(output(sourceOnly), /source-only.*archive filesystem\/hash checks were skipped/i);

  const { path, value } = releaseJson(fixture);
  value.archive.sha256 = 'invalid';
  writeReleaseJson(path, value);
  commitAll(fixture, 'corrupt ready archive metadata');
  const malformed = validateRelease(fixture, ['--source-only']);
  assert.notEqual(malformed.status, 0, 'source-only validation accepted malformed archive metadata');
  assert.match(output(malformed), /archive sha256 is invalid/i);

  const restored = releaseJson(fixture);
  restored.value.archive.sha256 = createHash('sha256').update(readyArchive).digest('hex');
  restored.value.launchGate.status = 'unsupported';
  writeReleaseJson(restored.path, restored.value);
  commitAll(fixture, 'corrupt the production launch gate');
  const unsafeLaunch = validateRelease(fixture, ['--source-only']);
  assert.notEqual(unsafeLaunch.status, 0, 'source-only validation weakened launch gates');
  assert.match(output(unsafeLaunch), /launch gate has unsupported status/i);
});

test('source-only bootstrap followed by artifact creation reaches full validation', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  const archivePath = markReadyWithoutArchive(fixture);

  assert.equal(validateRelease(fixture, ['--source-only']).status, 0);
  mkdirSync(dirname(archivePath), { recursive: true });
  writeFileSync(archivePath, readyArchive);
  const full = validateRelease(fixture);
  assert.equal(full.status, 0, output(full));
});

test('cedros-package orders source-only prevalidation before packaging and full validation after', () => {
  const makefile = readFileSync(join(root, 'Makefile'), 'utf8');
  const recipe = makefile.match(/cedros-package: verify-wit\n([\s\S]*?)\n\n# Build the wasm component/)?.[1];
  assert.ok(recipe, 'cedros-package recipe was not found');
  const sourceOnly = recipe.indexOf('node scripts/validate-extension.mjs --source-only');
  const nativeBuild = recipe.indexOf('cd ui/react-native');
  const packageArchive = recipe.indexOf('node scripts/package-extension.mjs');
  const full = recipe.lastIndexOf('node scripts/validate-extension.mjs');
  assert(sourceOnly >= 0, 'cedros-package lacks source-only prevalidation');
  assert(nativeBuild > sourceOnly, 'native runtime build must follow source-only validation');
  assert(packageArchive > nativeBuild, 'packaging must follow native runtime build');
  assert(packageArchive > sourceOnly, 'packaging must follow source-only validation');
  assert(full > packageArchive, 'full validation must follow archive creation');
});

test('accepts squash-equivalent evidence when packaged inputs are unchanged', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  const evidenceCommit = git(fixture, 'rev-parse', 'HEAD');
  pointReleaseAt(fixture, evidenceCommit);

  const squashedCommit = commitAll(fixture, 'squash-equivalent release', false);
  const ancestry = run('git', ['merge-base', '--is-ancestor', evidenceCommit, squashedCommit], fixture);
  assert.equal(ancestry.status, 1, 'fixture commits unexpectedly have an ancestor relationship');

  const result = validateRelease(fixture);
  assert.equal(result.status, 0, output(result));
});

test('accepts ready validation evidence after a squash when packaged inputs are unchanged', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  const evidenceCommit = git(fixture, 'rev-parse', 'HEAD');
  markReadyWithoutArchive(fixture);

  const squashedCommit = commitAll(fixture, 'squash-equivalent ready release', false);
  const ancestry = run('git', ['merge-base', '--is-ancestor', evidenceCommit, squashedCommit], fixture);
  assert.equal(ancestry.status, 1, 'fixture commits unexpectedly have an ancestor relationship');

  const result = validateRelease(fixture, ['--source-only']);
  assert.equal(result.status, 0, output(result));
  assert.match(output(result), /validation evidence commit .* non-ancestor provenance/i);
});

test('rejects a packaged source mutation even when releaseCommit is an ancestor', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  const evidenceCommit = git(fixture, 'rev-parse', 'HEAD');
  pointReleaseAt(fixture, evidenceCommit);
  commitAll(fixture, 'record release evidence');

  const beforeMutation = validateRelease(fixture);
  assert.equal(beforeMutation.status, 0, `fixture must start valid:\n${output(beforeMutation)}`);

  appendFileSync(join(fixture, 'server-wasm/domain/src/lib.rs'), '\n// packaged input mutation\n');
  commitAll(fixture, 'mutate packaged input');
  const afterMutation = validateRelease(fixture);
  assert.notEqual(afterMutation.status, 0, 'packaged source mutation was accepted');
  assert.match(output(afterMutation), /packaged input|digest|dirty/i);
});

test('rejects an unreviewed release builder mutation', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  pointReleaseAt(fixture, git(fixture, 'rev-parse', 'HEAD'));
  commitAll(fixture, 'record release evidence');

  appendFileSync(join(fixture, 'scripts/build-release-wasm.mjs'), '\n// changed builder\n');
  const result = validateRelease(fixture);
  assert.notEqual(result.status, 0, 'release builder mutation was accepted');
  assert.match(output(result), /packaged input|digest/i);
});

test('rejects a source mutation with refreshed mutable digest evidence', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  const reviewedCommit = git(fixture, 'rev-parse', 'HEAD');
  pointReleaseAt(fixture, reviewedCommit);
  commitAll(fixture, 'record reviewed source');

  appendFileSync(join(fixture, 'server-wasm/domain/src/lib.rs'), '\n// unreviewed source mutation\n');
  const printed = run(
    'node',
    ['scripts/validate-release-readiness.mjs', '--print-packaged-input-digest'],
    fixture,
  );
  assert.equal(printed.status, 0, output(printed));
  const inputsPath = join(fixture, 'cedros-extension.release-inputs.json');
  const inputs = JSON.parse(readFileSync(inputsPath, 'utf8'));
  inputs.packagedInputDigest = JSON.parse(printed.stdout);
  writeFileSync(inputsPath, `${JSON.stringify(inputs, null, 2)}\n`);
  commitAll(fixture, 'mutate source and refresh mutable checksum');

  const result = validateRelease(fixture);
  assert.notEqual(result.status, 0, 'mutable digest refresh bypassed reviewed source');
  assert.match(output(result), /reviewed source packaged input digest mismatch/i);
});

test('rejects an uncommitted packaged source mutation', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  pointReleaseAt(fixture, git(fixture, 'rev-parse', 'HEAD'));
  commitAll(fixture, 'record release evidence');

  appendFileSync(join(fixture, 'server-wasm/domain/src/lib.rs'), '\n// dirty packaged input\n');
  const result = validateRelease(fixture);
  assert.notEqual(result.status, 0, 'dirty packaged input was accepted');
  assert.match(output(result), /packaged input|digest/i);
});

test('rejects missing packaged input evidence', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  rmSync(join(fixture, 'cedros-extension.release-inputs.json'));

  const result = validateRelease(fixture);
  assert.notEqual(result.status, 0, 'missing packaged input evidence was accepted');
  assert.match(output(result), /release-inputs|ENOENT/i);
});

test('rejects a non-ready archive marked usable for installation', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  const evidenceCommit = git(fixture, 'rev-parse', 'HEAD');
  pointReleaseAt(fixture, evidenceCommit);
  const { path, value } = releaseJson(fixture);
  value.archive.usableForInstall = true;
  writeReleaseJson(path, value);
  commitAll(fixture, 'mislabel superseded archive as installable');

  const result = validateRelease(fixture);
  assert.notEqual(result.status, 0, 'installable non-ready archive was accepted');
  assert.match(output(result), /non-ready archive usableForInstall/i);
});

test('rejects upload-ready instructions for a non-ready archive', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  const evidenceCommit = git(fixture, 'rev-parse', 'HEAD');
  pointReleaseAt(fixture, evidenceCommit);
  const { path, value } = releaseJson(fixture);
  value.operatorHandoff.uploadLocation = 'Do not upload this upload-ready archive.';
  writeReleaseJson(path, value);
  commitAll(fixture, 'publish unsafe operator instruction');

  const result = validateRelease(fixture);
  assert.notEqual(result.status, 0, 'upload-ready non-ready archive was accepted');
  assert.match(output(result), /upload-ready/i);
});

test('rejects directions to install the historical archive', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  const evidenceCommit = git(fixture, 'rev-parse', 'HEAD');
  pointReleaseAt(fixture, evidenceCommit);
  const { path, value } = releaseJson(fixture);
  value.operatorHandoff.installSteps[0] =
    'Use artifacts/cedros-pay-2.0.1.cedros-extension.zip for package intake.';
  writeReleaseJson(path, value);
  commitAll(fixture, 'direct operator to superseded archive');

  const result = validateRelease(fixture);
  assert.notEqual(result.status, 0, 'historical archive install direction was accepted');
  assert.match(output(result), /must not direct operators/i);
});

test('requires a fresh package build before non-ready evidence can be handed off', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  const evidenceCommit = git(fixture, 'rev-parse', 'HEAD');
  pointReleaseAt(fixture, evidenceCommit);
  const { path, value } = releaseJson(fixture);
  value.operatorHandoff.freshBuildInstructions = ['Reuse the recorded checksum.'];
  writeReleaseJson(path, value);
  commitAll(fixture, 'omit fresh package build');

  const result = validateRelease(fixture);
  assert.notEqual(result.status, 0, 'non-ready evidence without a fresh build was accepted');
  assert.match(output(result), /rebuild with make cedros-package/i);
});

test('preserves archive digest validation for ready release evidence', (t) => {
  const fixture = createReleaseFixture();
  t.after(() => removeTempDir(fixture));
  const evidenceCommit = git(fixture, 'rev-parse', 'HEAD');
  pointReleaseAt(fixture, evidenceCommit);
  const { path, value } = releaseJson(fixture);
  const archive = Buffer.from('fixture archive bytes');
  const archivePath = join(fixture, value.archive.relativePath);
  mkdirSync(dirname(archivePath), { recursive: true });
  writeFileSync(archivePath, archive);

  value.releaseCommit = evidenceCommit;
  value.installGate.status = 'ready';
  value.signOff.installGateStatus = 'ready';
  value.archive.evidenceStatus = 'current-verified';
  value.archive.usableForInstall = true;
  value.operatorHandoff.requiresFreshBuild = false;
  value.archive.sha256 = createHash('sha256').update(archive).digest('hex');
  value.archive.entryCount = 1;
  value.archive.zipBytes = archive.length;
  value.archive.uncompressedBytes = archive.length;
  value.supplyChainVerification.archiveSha256 = value.archive.sha256;
  for (const evidence of value.validationEvidence) evidence.commit = evidenceCommit;
  writeReleaseJson(path, value);
  commitAll(fixture, 'record ready release evidence');

  const beforeMutation = validateRelease(fixture);
  assert.equal(beforeMutation.status, 0, `fixture must start valid:\n${output(beforeMutation)}`);

  appendFileSync(archivePath, 'tampered');
  const afterMutation = validateRelease(fixture);
  assert.notEqual(afterMutation.status, 0, 'archive mutation was accepted');
  assert.match(output(afterMutation), /archive sha256 mismatch/i);
});
