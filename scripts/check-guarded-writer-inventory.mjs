#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { validateGuardedWriterInventory } from './lib/guarded-writer-inventory-validation.mjs';

const root = resolve('.');
const sourceRoot = resolve(root, 'server-wasm/domain/src');

function collect(directory, sources) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collect(path, sources);
    } else if (entry.name.endsWith('.rs') && productionFile(entry.name)) {
      const key = relative(root, path).split(sep).join('/');
      sources.set(key, readFileSync(path, 'utf8'));
    }
  }
}

function productionFile(name) {
  return !/(?:^|_)(?:test|tests)(?:\.|_)/.test(name)
    && !name.startsWith('fake')
    && name !== 'guarded_batch_tests.rs';
}

try {
  const inventory = JSON.parse(
    readFileSync(resolve(root, 'docs/guarded-only-writer-inventory.json'), 'utf8'),
  );
  const sources = new Map();
  collect(sourceRoot, sources);
  const result = validateGuardedWriterInventory(inventory, sources);
  console.log(
    `Guarded writer inventory passed (${result.candidateModelCount} candidate models, `
      + `${result.directMutationCount} non-candidate direct mutations, `
      + `${result.plainBatchCount} policy-only plain batch).`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
