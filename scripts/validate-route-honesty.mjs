#!/usr/bin/env node
import { assertIncompleteRouteHonesty } from './lib/route-honesty-validation.mjs';
import { readJson } from './lib/validation-helpers.mjs';

try {
  assertIncompleteRouteHonesty(
    readJson('cedros-extension.manifest.json'),
    readJson('cedros-extension.host-handoff.json'),
  );
  console.log('Cedros incomplete route honesty passed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
