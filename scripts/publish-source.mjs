import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionId = 'cedros-pay';

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, maxBuffer: 128 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git ${args[0]} failed: ${result.stderr.toString().trim()}`);
  return result.stdout;
}

function isPublicSource(path) {
  const parts = path.split('/');
  const excluded = new Set([
    '.git', '.context', '.codex', '.claude', '.gemini', '.opencode',
    'node_modules', 'target', 'dist', 'coverage', '.next', '__pycache__',
  ]);
  if (parts.some(part => excluded.has(part))) return false;
  if (parts[0] === 'artifacts') return false;
  const name = parts.at(-1);
  if (['.mcp.json', 'opencode.json', '.DS_Store', 'credentials', 'credentials.toml'].includes(name)) return false;
  if (name.startsWith('.env') && !/^\.env(?:\.[\w-]+)?\.example$/.test(name)) return false;
  return !/\.(?:zip|tgz|wasm|pem|key|p12|log|tsbuildinfo)$/.test(name);
}

function overlaps(a, b) {
  const path = relative(a, b);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..');
}

export function prepareSource({ sourceRoot, destination, version, dryRun = false }) {
  const source = realpathSync(sourceRoot);
  const target = realpathSync(destination);
  if (overlaps(source, target) || overlaps(target, source)) {
    throw new Error('Source and publish checkout must be separate, non-nested directories');
  }
  for (const root of [source, target]) {
    if (realpathSync(git(root, ['rev-parse', '--show-toplevel']).toString().trim()) !== root) {
      throw new Error('Use the root of a Git checkout, not a package subdirectory');
    }
  }
  const remote = git(target, ['remote', 'get-url', 'origin']).toString().trim();
  const allowedRemotes = [
    `https://github.com/conorholds/${extensionId}.git`,
    `https://github.com/conorholds/${extensionId}`,
    `git@github.com:conorholds/${extensionId}.git`,
    `ssh://git@github.com/conorholds/${extensionId}.git`,
  ];
  if (!allowedRemotes.includes(remote)) throw new Error(`Publish origin must be conorholds/${extensionId}`);
  if (git(source, ['status', '--porcelain=v1', '--untracked-files=no']).length) {
    throw new Error('Commit tracked source changes before preparing publication');
  }
  if (git(target, ['status', '--porcelain=v1', '--untracked-files=all', '--ignored']).length) {
    throw new Error('Publish checkout must be clean, including untracked and ignored files');
  }
  const sha = git(source, ['rev-parse', 'HEAD']).toString().trim();
  const manifest = JSON.parse(git(source, ['show', `${sha}:cedros-extension.manifest.json`]).toString());
  if (manifest.extensionId !== extensionId || typeof manifest.version !== 'string') {
    throw new Error(`Expected a versioned ${extensionId} manifest`);
  }
  if (version !== undefined && version !== manifest.version) {
    throw new Error(`Requested version must match committed manifest version ${manifest.version}`);
  }
  const entries = git(source, ['ls-tree', '-r', '-z', sha]).toString().split('\0').filter(Boolean);
  const files = [];
  for (const entry of entries) {
    const separator = entry.indexOf('\t');
    const metadata = entry.slice(0, separator);
    const path = entry.slice(separator + 1);
    if (!isPublicSource(path)) continue;
    if (!/^100(?:644|755) blob /.test(metadata)) {
      throw new Error(`Publication does not support symlinks or submodules: ${path}`);
    }
    files.push(path);
  }
  for (const required of ['README.md', 'LICENSE.md', 'cedros-extension.manifest.json']) {
    if (!files.includes(required)) throw new Error(`Missing required source file: ${required}`);
  }
  const staging = mkdtempSync(join(tmpdir(), `${extensionId}-source-`));
  try {
    const archive = git(source, ['archive', '--format=tar', sha, '--', ...files]);
    const extracted = spawnSync('tar', ['-xf', '-', '-C', staging], { input: archive });
    if (extracted.error) throw extracted.error;
    if (extracted.status !== 0) throw new Error(`Source extraction failed: ${extracted.stderr.toString().trim()}`);
    for (const path of files.filter(path => path.split('/').at(-1) === '.npmrc')) {
      if (/(?:_auth(?:Token)?|password|username)\s*=/i.test(readFileSync(join(staging, path), 'utf8'))) {
        throw new Error('Remove registry credentials from tracked .npmrc files before publication');
      }
    }
    if (!dryRun) {
      if (git(target, ['status', '--porcelain=v1', '--untracked-files=all', '--ignored']).length) {
        throw new Error('Publish checkout changed during preparation; no files were replaced');
      }
      // The clean-checkout guard above protects local work. Keep Git history and remotes.
      for (const entry of readdirSync(target)) {
        if (entry !== '.git') rmSync(join(target, entry), { recursive: true, force: true });
      }
      for (const entry of readdirSync(staging)) {
        cpSync(join(staging, entry), join(target, entry), { recursive: true, preserveTimestamps: true });
      }
    }
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  return { extensionId, version: manifest.version, sha, destination: target, fileCount: files.length, dryRun };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: bash scripts/publish.sh [version] [--dry-run]');
    console.log(`Prepares committed source in PUBLISH_REPO (default ~/Workspace/published/${extensionId}).`);
    console.log('The checkout must already exist, have the matching public origin, and be clean.');
    console.log('Does not build, bump versions, commit, push, publish packages, or deploy extensions.');
    return;
  }
  const versions = args.filter(arg => arg !== '--dry-run');
  if (versions.length > 1 || versions.some(arg => arg.startsWith('-'))) throw new Error('Unexpected publishing arguments; use --help');
  const result = prepareSource({
    sourceRoot: resolve(dirname(fileURLToPath(import.meta.url)), '..'),
    destination: process.env.PUBLISH_REPO || join(homedir(), 'Workspace', 'published', extensionId),
    version: versions[0],
    dryRun: args.includes('--dry-run'),
  });
  console.log(`${result.dryRun ? 'Would prepare' : 'Prepared'} ${extensionId} ${result.version}: ${result.fileCount} source files from ${result.sha}`);
  console.log(`Destination: ${result.destination}`);
  console.log('Review git status and git diff in the publish checkout before committing or pushing.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) {
    console.error(`Publication failed: ${error.message}`);
    process.exitCode = 1;
  }
}
