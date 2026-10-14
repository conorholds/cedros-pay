import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CEDROS_PAY_EXTENSION_VERSION,
  CEDROS_PAY_SERVER_VERSION,
  CEDROS_PAY_REACT_NATIVE_VERSION,
} from '../../ui/src/extension/constants.ts';

const manifest = JSON.parse(readFileSync(new URL('../../cedros-extension.manifest.json', import.meta.url)));

test('runtime release versions match the canonical archive manifest', () => {
  assert.equal(CEDROS_PAY_EXTENSION_VERSION, manifest.version);
  assert.equal(CEDROS_PAY_EXTENSION_VERSION, manifest.packageFamily.react.version);
  assert.equal(CEDROS_PAY_SERVER_VERSION, manifest.packageFamily.server.version);
  assert.equal(CEDROS_PAY_REACT_NATIVE_VERSION, manifest.packageFamily.reactNative.version);
});
