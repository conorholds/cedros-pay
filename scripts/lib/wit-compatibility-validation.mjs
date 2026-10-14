import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { assert, root } from './validation-helpers.mjs';

export const vendoredWitPath = resolve(
  root,
  'server-wasm/guest/wit/cedros-extension.wit',
);

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function assertManifestWitChecksum(manifest, path = vendoredWitPath) {
  const declared = manifest.compatibility?.witChecksum;
  assert(
    /^[a-f0-9]{64}$/.test(declared ?? ''),
    'compatibility.witChecksum must be a lowercase SHA-256 digest',
  );
  const actual = sha256File(path);
  assert(
    declared === actual,
    `compatibility.witChecksum ${declared} does not match vendored WIT ${actual}`,
  );
}
