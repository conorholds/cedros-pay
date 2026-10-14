#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const productionRoots = [
  'server-wasm/domain/src',
  'server-wasm/guest/src',
  'server-wasm/hostsim/src',
  'ui/src',
  'ui/react-native/src',
  'scripts',
];
const sourceExtensions = new Set([
  '.cjs', '.css', '.js', '.jsx', '.mjs', '.rs', '.scss', '.sh', '.ts', '.tsx',
]);
const ignoredDirectories = new Set([
  '.git', '.next', 'artifacts', 'coverage', 'dist', 'node_modules', 'target',
]);

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function normalize(path) {
  return path.split(sep).join('/');
}

function isTestFile(path) {
  const parts = path.split('/');
  const name = parts.at(-1) ?? '';
  return parts.some((part) => part === '__tests__' || part === 'tests')
    || /(?:^|_)(?:test|tests)(?:\.|_)/.test(name)
    || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(name);
}

function collectFiles(directory, repositoryRoot, files) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        collectFiles(join(directory, entry.name), repositoryRoot, files);
      }
      continue;
    }
    const path = normalize(relative(repositoryRoot, join(directory, entry.name)));
    if (sourceExtensions.has(extname(entry.name)) && !isTestFile(path)) files.push(path);
  }
}

function lineCount(path) {
  const text = readFileSync(path, 'utf8');
  if (text.length === 0) return 0;
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  return lines.length;
}

function validateBaseline(baseline) {
  if (baseline.schemaVersion !== 1) throw new Error('file-size baseline schemaVersion must be 1');
  if (!Number.isInteger(baseline.maxLines) || baseline.maxLines < 1) {
    throw new Error('file-size baseline maxLines must be a positive integer');
  }
  if (!baseline.files || Array.isArray(baseline.files) || typeof baseline.files !== 'object') {
    throw new Error('file-size baseline files must be an object');
  }
  for (const [path, allowedLines] of Object.entries(baseline.files)) {
    if (!Number.isInteger(allowedLines) || allowedLines <= baseline.maxLines) {
      throw new Error(`${path} baseline must be an integer above ${baseline.maxLines}`);
    }
  }
}

function main() {
  const repositoryRoot = resolve(argument('--root', '.'));
  const baselinePath = resolve(argument('--baseline', join(repositoryRoot, 'scripts/file-size-baseline.json')));
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  validateBaseline(baseline);

  const files = [];
  for (const sourceRoot of productionRoots) {
    collectFiles(resolve(repositoryRoot, sourceRoot), repositoryRoot, files);
  }
  const violations = [];
  const counts = new Map();
  for (const path of files.sort()) {
    const lines = lineCount(resolve(repositoryRoot, path));
    counts.set(path, lines);
    if (lines <= baseline.maxLines) continue;
    const allowance = baseline.files[path];
    if (allowance === undefined) {
      violations.push(`${path}: new oversized production file has ${lines} lines (limit ${baseline.maxLines})`);
    } else if (lines > allowance) {
      violations.push(`${path}: grew from allowed ${allowance} to ${lines} lines`);
    }
  }
  for (const [path, allowance] of Object.entries(baseline.files)) {
    const lines = counts.get(path);
    if (lines === undefined) {
      violations.push(`${path}: stale baseline entry for a missing or non-production file`);
    } else if (lines <= baseline.maxLines) {
      violations.push(
        `${path}: stale ${allowance}-line baseline must be removed after shrinking to ${lines}`,
      );
    } else if (lines < allowance) {
      violations.push(
        `${path}: baseline must ratchet down from ${allowance} to current size ${lines}`,
      );
    }
  }
  if (violations.length > 0) {
    throw new Error(`file-size guard failed:\n  ${violations.join('\n  ')}`);
  }
  console.log(`File-size guard passed (${files.length} production source files checked).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
