#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { assertConditionalMutationReadiness } from './lib/conditional-mutation-validation.mjs';
import { readJson } from './lib/validation-helpers.mjs';

try {
  assertConditionalMutationReadiness(
    readJson('cedros-extension.manifest.json'),
    readJson('cedros-extension.host-handoff.json'),
    readFileSync('server-wasm/domain/src/conditional_mutations.rs', 'utf8'),
    readJson('docs/cedros-data-guarded-batch-provenance.json'),
    readJson('docs/guarded-only-writer-inventory.json'),
  );
  console.log('Cedros conditional mutation readiness passed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
