#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function pathsForExportTarget(target) {
  if (typeof target === 'string') {
    return [target];
  }
  if (!target || typeof target !== 'object') {
    return [];
  }

  return Object.entries(target)
    .filter(([condition]) => condition !== 'react-native')
    .flatMap(([, value]) => pathsForExportTarget(value));
}

function getPackedFiles() {
  const result = spawnSync('npm', ['pack', '--json', '--dry-run', '--ignore-scripts'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    console.error('Failed to inspect npm pack output.');
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
    process.exit(result.status ?? 1);
  }

  try {
    const packResult = JSON.parse(result.stdout);
    return new Set((packResult[0]?.files ?? []).map((file) => file.path));
  } catch (error) {
    console.error('Failed to parse npm pack output.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function toPackPath(relativePath) {
  return relativePath.replace(/^\.\//, '');
}

const exportTargets = Object.entries(pkg.exports)
  .flatMap(([subpath, target]) =>
    pathsForExportTarget(target).map((relativePath) => ({ subpath, relativePath }))
  );

const missing = exportTargets.filter(({ relativePath }) => !fs.existsSync(path.join(ROOT, relativePath)));

if (missing.length > 0) {
  console.error('Missing package export targets:');
  for (const entry of missing) {
    console.error(`  ${entry.subpath} -> ${entry.relativePath}`);
  }
  process.exit(1);
}

const packedFiles = getPackedFiles();
const missingFromPack = exportTargets.filter(
  ({ relativePath }) => !packedFiles.has(toPackPath(relativePath))
);

if (missingFromPack.length > 0) {
  console.error('Missing packed package export targets:');
  for (const entry of missingFromPack) {
    console.error(`  ${entry.subpath} -> ${entry.relativePath}`);
  }
  process.exit(1);
}

console.log('All package export targets exist and are included in npm pack.');
