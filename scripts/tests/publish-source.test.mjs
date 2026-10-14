import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { prepareSource } from '../publish-source.mjs';

const extensionId = 'cedros-pay';
function git(root, ...args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function write(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}
function commit(root) {
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'fixture');
}
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'publish source '));
  const sourceRoot = join(root, 'source');
  const destination = join(root, 'published');
  for (const checkout of [sourceRoot, destination]) {
    mkdirSync(checkout);
    git(checkout, 'init', '-q');
    git(checkout, 'config', 'user.name', 'Fixture');
    git(checkout, 'config', 'user.email', 'fixture@example.invalid');
    git(checkout, 'config', 'commit.gpgsign', 'false');
  }
  write(sourceRoot, 'cedros-extension.manifest.json', JSON.stringify({ extensionId, version: '2.3.4' }));
  write(sourceRoot, 'README.md', 'Current extension source');
  write(sourceRoot, 'LICENSE.md', 'Current source license');
  write(sourceRoot, 'server-wasm/src/lib.rs', '// Wasm source');
  write(sourceRoot, 'ui/src/register.ts', '// web registration');
  write(sourceRoot, 'docs/contract.md', 'Published contract');
  write(sourceRoot, 'scripts/check.sh', '#!/bin/sh\nexit 0\n');
  chmodSync(join(sourceRoot, 'scripts/check.sh'), 0o755);
  commit(sourceRoot);
  write(destination, 'LICENSE', 'Legacy MIT license');
  write(destination, 'react/dist/old.js', '// legacy package');
  commit(destination);
  git(destination, 'remote', 'add', 'origin', `https://github.com/conorholds/${extensionId}.git`);
  try { run({ root, sourceRoot, destination }); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('replaces legacy package layout with source while preserving public Git history and origin', () => fixture(options => {
  const previous = git(options.destination, 'rev-parse', 'HEAD');
  const result = prepareSource(options);
  assert.equal(result.version, '2.3.4');
  assert.equal(result.sha, git(options.sourceRoot, 'rev-parse', 'HEAD'));
  assert.equal(result.fileCount, 7);
  assert.equal(git(options.destination, 'rev-parse', 'HEAD'), previous);
  assert.equal(git(options.destination, 'show', 'HEAD:LICENSE'), 'Legacy MIT license');
  assert.equal(git(options.destination, 'remote', 'get-url', 'origin'), `https://github.com/conorholds/${extensionId}.git`);
  assert.equal(existsSync(join(options.destination, 'react')), false);
  assert.equal(existsSync(join(options.destination, 'LICENSE')), false);
  assert.equal(readFileSync(join(options.destination, 'LICENSE.md'), 'utf8'), 'Current source license');
  assert.equal(readFileSync(join(options.destination, 'server-wasm/src/lib.rs'), 'utf8'), '// Wasm source');
  assert.equal(readFileSync(join(options.destination, 'docs/contract.md'), 'utf8'), 'Published contract');
  assert.equal(statSync(join(options.destination, 'scripts/check.sh')).mode & 0o111, 0o111);
}));

test('dry-run validates the export without changing the destination', () => fixture(options => {
  const result = prepareSource({ ...options, dryRun: true, version: '2.3.4' });
  assert.equal(result.dryRun, true);
  assert.equal(git(options.destination, 'status', '--porcelain'), '');
  assert.equal(readFileSync(join(options.destination, 'LICENSE'), 'utf8'), 'Legacy MIT license');
}));

test('excludes local configuration, credentials, generated archives and untracked files', () => fixture(options => {
  for (const path of ['.codex/config.toml', '.mcp.json', 'ui/.env', 'ui/.env.production', '.cargo/credentials.toml', 'artifacts/release.json', 'ui/dist/bundle.js', 'server/target/debug/output', 'node_modules/pkg/index.js', 'release.cedros-extension.zip', 'key.pem']) {
    write(options.sourceRoot, path, 'private or generated');
  }
  write(options.sourceRoot, 'ui/.env.example', 'PUBLIC_SAMPLE=example');
  write(options.sourceRoot, 'ui/.env.production.example', 'PUBLIC_SAMPLE=example');
  write(options.sourceRoot, 'ui/.npmrc', 'save-exact=true\n');
  commit(options.sourceRoot);
  write(options.sourceRoot, 'untracked-secret.txt', 'local');
  prepareSource(options);
  assert.equal(existsSync(join(options.destination, '.codex')), false);
  assert.equal(existsSync(join(options.destination, 'ui/.env')), false);
  assert.equal(existsSync(join(options.destination, 'ui/.env.production')), false);
  assert.equal(existsSync(join(options.destination, 'ui/dist')), false);
  assert.equal(existsSync(join(options.destination, 'untracked-secret.txt')), false);
  assert.equal(existsSync(join(options.destination, 'ui/.env.example')), true);
  assert.equal(existsSync(join(options.destination, 'ui/.env.production.example')), true);
  assert.equal(existsSync(join(options.destination, 'ui/.npmrc')), true);
}));

for (const state of ['tracked', 'staged', 'untracked', 'ignored']) {
  test(`rejects ${state} destination work without overwriting it`, () => fixture(options => {
    if (state === 'ignored') {
      write(options.destination, '.gitignore', 'local.txt\n');
      commit(options.destination);
    }
    const path = state === 'tracked' || state === 'staged' ? 'LICENSE' : 'local.txt';
    write(options.destination, path, 'operator work');
    if (state === 'staged') git(options.destination, 'add', path);
    assert.throws(() => prepareSource(options), /Publish checkout must be clean/);
    assert.equal(readFileSync(join(options.destination, path), 'utf8'), 'operator work');
  }));
}

test('rejects uncommitted tracked source and mismatching requested versions', () => fixture(options => {
  assert.throws(() => prepareSource({ ...options, version: '9.9.9' }), /match committed manifest/);
  write(options.sourceRoot, 'README.md', 'uncommitted');
  assert.throws(() => prepareSource(options), /Commit tracked source changes/);
  assert.equal(git(options.destination, 'status', '--porcelain'), '');
}));

test('rejects a wrong public remote and wrong extension identity', () => fixture(options => {
  git(options.destination, 'remote', 'set-url', 'origin', 'https://github.com/conorholds/other.git');
  assert.throws(() => prepareSource(options), /Publish origin must be/);
  git(options.destination, 'remote', 'set-url', 'origin', `git@github.com:conorholds/${extensionId}.git`);
  write(options.sourceRoot, 'cedros-extension.manifest.json', JSON.stringify({ extensionId: 'other', version: '2.3.4' }));
  commit(options.sourceRoot);
  assert.throws(() => prepareSource(options), /Expected a versioned/);
}));

test('rejects overlapping directories, symlink aliases, and package-subdirectory destinations', () => fixture(options => {
  assert.throws(() => prepareSource({ ...options, destination: options.sourceRoot }), /non-nested/);
  assert.throws(() => prepareSource({ ...options, destination: join(options.sourceRoot, 'ui') }), /non-nested/);
  assert.throws(() => prepareSource({ ...options, sourceRoot: options.root }), /non-nested/);
  symlinkSync(options.sourceRoot, join(options.root, 'alias'));
  assert.throws(() => prepareSource({ ...options, destination: join(options.root, 'alias') }), /non-nested/);
  assert.throws(() => prepareSource({ ...options, destination: join(options.destination, 'react') }), /root of a Git checkout/);
}));

test('rejects registry credentials and tracked symlinks before destination changes', () => fixture(options => {
  write(options.sourceRoot, 'ui/.npmrc', '//registry.npmjs.org/:_authToken=fixture-value\n');
  commit(options.sourceRoot);
  assert.throws(() => prepareSource(options), /Remove registry credentials/);
  assert.equal(git(options.destination, 'status', '--porcelain'), '');
  rmSync(join(options.sourceRoot, 'ui/.npmrc'));
  symlinkSync('/tmp', join(options.sourceRoot, 'external'));
  commit(options.sourceRoot);
  assert.throws(() => prepareSource(options), /symlinks or submodules/);
  assert.equal(git(options.destination, 'status', '--porcelain'), '');
}));

test('supports Git worktree destinations whose .git is a file', () => fixture(options => {
  const destination = join(options.root, 'public worktree');
  git(options.destination, 'worktree', 'add', '-qb', 'publication', destination);
  prepareSource({ ...options, destination });
  assert.equal(statSync(join(destination, '.git')).isFile(), true);
  assert.equal(readFileSync(join(destination, 'README.md'), 'utf8'), 'Current extension source');
  assert.equal(git(destination, 'show', 'HEAD:LICENSE'), 'Legacy MIT license');
}));
