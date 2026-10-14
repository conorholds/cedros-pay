import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  isPackagedInput,
  packagedInputScopeVersion,
} from './extension-package-inputs.mjs';

function git(repositoryRoot, args) {
  const result = spawnSync('git', args, { cwd: repositoryRoot });
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed: ${result.stderr.toString('utf8').trim()}`);
  }
  return result.stdout;
}

function workspaceFiles(repositoryRoot) {
  return git(
    repositoryRoot,
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  ).toString('utf8').split('\0').filter((path) => (
    isPackagedInput(path) && workspacePathExists(repositoryRoot, path)
  )).sort();
}

function workspacePathExists(repositoryRoot, path) {
  try {
    lstatSync(resolve(repositoryRoot, path));
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function treeFiles(repositoryRoot, treeish) {
  return git(
    repositoryRoot,
    ['ls-tree', '-r', '-z', '--name-only', `${treeish}^{tree}`, '--'],
  ).toString('utf8').split('\0').filter(isPackagedInput).sort();
}

function workspaceBytes(repositoryRoot, path) {
  const absolutePath = resolve(repositoryRoot, path);
  return lstatSync(absolutePath).isSymbolicLink()
    ? Buffer.from(readlinkSync(absolutePath))
    : readFileSync(absolutePath);
}

function treeBytes(repositoryRoot, treeish, path) {
  return git(repositoryRoot, ['cat-file', 'blob', `${treeish}:${path}`]);
}

function digestFiles(files, readBytes) {
  const hash = createHash('sha256');
  hash.update(`cedros-packaged-inputs-v${packagedInputScopeVersion}\0`);
  for (const path of files) {
    const bytes = readBytes(path);
    hash.update(`${Buffer.byteLength(path)}:${path}\0${bytes.byteLength}:`);
    hash.update(bytes);
    hash.update('\0');
  }
  return {
    algorithm: 'sha256',
    scopeVersion: packagedInputScopeVersion,
    sha256: hash.digest('hex'),
    fileCount: files.length,
  };
}

export function calculatePackagedInputDigest(repositoryRoot, options = {}) {
  const treeish = options.treeish;
  const files = treeish
    ? treeFiles(repositoryRoot, treeish)
    : workspaceFiles(repositoryRoot);
  const readBytes = treeish
    ? (path) => treeBytes(repositoryRoot, treeish, path)
    : (path) => workspaceBytes(repositoryRoot, path);
  return digestFiles(files, readBytes);
}
