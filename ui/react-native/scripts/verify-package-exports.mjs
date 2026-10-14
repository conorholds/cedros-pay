#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import {
  buildNativeRuntimePackageJson,
  collectNativeRuntimeFiles,
  verifyNativeRuntimePackage,
} from '../../../scripts/lib/extension-runtime-package.mjs';

const manifest = JSON.parse(readFileSync(new URL('../../../cedros-extension.manifest.json', import.meta.url)));
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const entries = collectNativeRuntimeFiles(pkg);
entries.set('workspace/react-native/package.json', buildNativeRuntimePackageJson(manifest, pkg));
const result = verifyNativeRuntimePackage(entries, manifest, pkg);
console.log(`Extension native registration export passed (${result.filePaths.length} runtime files).`);
