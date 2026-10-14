import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: 'utf8' });
}

export function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

export function createTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function removeTempDir(path) {
  rmSync(path, { recursive: true, force: true });
}

export function workspaceFiles(cwd = root) {
  const output = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd },
  );
  // Cached entries include unstaged deletions; fixtures represent the working tree.
  const deleted = new Set(execFileSync('git', ['ls-files', '-z', '--deleted'], { cwd })
    .toString('utf8').split('\0'));
  return output.toString('utf8').split('\0').filter(path => path && !deleted.has(path));
}

function copyPath(relativePath, destinationRoot) {
  const source = join(root, relativePath);
  const destination = join(destinationRoot, relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  const stat = lstatSync(source);
  if (stat.isSymbolicLink()) {
    symlinkSync(readlinkSync(source), destination);
  } else {
    copyFileSync(source, destination);
  }
}

export function createReleaseFixture() {
  const fixture = createTempDir('cedros-release-readiness-');
  for (const relativePath of workspaceFiles()) {
    copyPath(relativePath, fixture);
  }
  const releasePath = join(fixture, 'cedros-extension.release-readiness.json');
  const release = JSON.parse(readFileSync(releasePath, 'utf8'));
  release.installGate.status = 'deferred';
  release.signOff.installGateStatus = 'deferred';
  release.archive.evidenceStatus = 'not-built';
  release.archive.usableForInstall = false;
  release.archive.sha256 = null;
  release.archive.entryCount = 0;
  release.archive.zipBytes = 0;
  release.archive.uncompressedBytes = 0;
  release.supplyChainVerification.status = 'not-provided';
  release.supplyChainVerification.archiveSha256 = null;
  release.operatorHandoff.requiresFreshBuild = true;
  release.operatorHandoff.uploadLocation = 'Do not upload the historical fixture archive.';
  release.operatorHandoff.freshBuildInstructions = ['Run make cedros-package from reviewed source.'];
  writeFileSync(releasePath, `${JSON.stringify(release)}\n`);
  git(fixture, 'init', '--quiet');
  git(fixture, 'config', 'user.email', 'quality-tests@cedros.invalid');
  git(fixture, 'config', 'user.name', 'Cedros Quality Tests');
  git(fixture, 'add', '-A');
  git(fixture, 'commit', '--quiet', '-m', 'packaged evidence');
  return fixture;
}

export function releaseJson(fixture) {
  const path = join(fixture, 'cedros-extension.release-readiness.json');
  return { path, value: JSON.parse(readFileSync(path, 'utf8')) };
}

export function writeReleaseJson(path, release) {
  writeFileSync(path, `${JSON.stringify(release)}\n`);
}

export function pointReleaseAt(fixture, commit) {
  const { path, value } = releaseJson(fixture);
  value.releaseCommit = commit;
  writeReleaseJson(path, value);
  const inputsPath = join(fixture, 'cedros-extension.release-inputs.json');
  const inputs = JSON.parse(readFileSync(inputsPath, 'utf8'));
  inputs.reviewedSourceCommit = commit;
  const digest = run(
    'node',
    ['scripts/validate-release-readiness.mjs', '--print-packaged-input-digest'],
    fixture,
  );
  if (digest.status !== 0) {
    throw new Error(`could not calculate fixture packaged-input digest: ${output(digest)}`);
  }
  inputs.packagedInputDigest = JSON.parse(digest.stdout);
  writeFileSync(inputsPath, `${JSON.stringify(inputs, null, 2)}\n`);
}

export function commitAll(fixture, message, parent = true) {
  git(fixture, 'add', '-A');
  const tree = git(fixture, 'write-tree');
  const args = ['commit-tree', tree, '-m', message];
  if (parent) args.push('-p', git(fixture, 'rev-parse', 'HEAD'));
  const commit = git(fixture, ...args);
  git(fixture, 'reset', '--quiet', '--hard', commit);
  return commit;
}

export function validateRelease(fixture, args = []) {
  return run('node', ['scripts/validate-release-readiness.mjs', ...args], fixture);
}

export function output(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}
