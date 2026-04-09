#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const WEB_ROOT = path.join(ROOT, 'src');
const RN_ROOT = path.join(ROOT, 'react-native', 'src');
const BASELINE_PATH = path.join(ROOT, 'scripts', 'duplication-baseline.json');

function walkFiles(rootDir, currentDir = rootDir, acc = []) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(rootDir, absPath, acc);
      continue;
    }
    if (!entry.isFile()) continue;

    const relativePath = path.relative(rootDir, absPath).replaceAll(path.sep, '/');
    acc.push(relativePath);
  }

  return acc;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(`Baseline file not found: ${BASELINE_PATH}`);
  }

  const raw = fs.readFileSync(BASELINE_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.allowedMirroredFiles)) {
    throw new Error('Baseline file missing "allowedMirroredFiles" array');
  }

  return parsed;
}

function getMirroredFiles() {
  const webFiles = new Set(walkFiles(WEB_ROOT));
  const rnFiles = new Set(walkFiles(RN_ROOT));

  return Array.from(webFiles).filter((relativePath) => rnFiles.has(relativePath)).sort();
}

function main() {
  const isCiMode = process.argv.includes('--ci');
  const baseline = loadBaseline();
  const mirroredFiles = getMirroredFiles();

  const allowed = new Set(baseline.allowedMirroredFiles);
  const unexpected = mirroredFiles.filter((file) => !allowed.has(file));
  const missingFromCurrent = baseline.allowedMirroredFiles.filter((file) => !mirroredFiles.includes(file));

  console.log(`[duplication-guard] Mirrored file count: ${mirroredFiles.length}`);
  console.log(`[duplication-guard] Baseline allowed count: ${baseline.allowedMirroredFiles.length}`);

  if (missingFromCurrent.length > 0) {
    console.log('[duplication-guard] Baseline entries removed from current tree (informational):');
    for (const file of missingFromCurrent) {
      console.log(`  - ${file}`);
    }
  }

  if (unexpected.length > 0) {
    console.log('[duplication-guard] New mirrored files not in baseline:');
    for (const file of unexpected) {
      console.log(`  - ${file}`);
    }
  } else {
    console.log('[duplication-guard] No new mirrored files detected.');
  }

  if (isCiMode && unexpected.length > 0) {
    console.error('[duplication-guard] CI check failed: new mirrored files detected.');
    process.exit(1);
  }
}

main();
