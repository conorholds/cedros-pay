#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import {
  buildRuntimePackageJson,
  collectRuntimeDistFiles,
  verifyRuntimePackage,
} from '../../scripts/lib/extension-runtime-package.mjs';

const manifest = JSON.parse(readFileSync(new URL('../../cedros-extension.manifest.json', import.meta.url)));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const entries = collectRuntimeDistFiles();
entries.set('workspace/react/package.json', buildRuntimePackageJson(manifest, pkg));
const result = verifyRuntimePackage(entries, manifest, pkg);
if (result.importViolations.length > 0) throw new Error(result.importViolations.join('\n'));
console.log(`Extension admin/web exports passed (${result.browserSafeEsmFiles} browser-safe ESM files).`);
