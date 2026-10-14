#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(packageRoot, '../..');
const sourcePath = path.join(repositoryRoot, 'cedros-extension.manifest.json');
const targetPath = path.join(packageRoot, 'src/extensionManifest.generated.json');
const canonical = `${JSON.stringify(JSON.parse(await readFile(sourcePath, 'utf8')))}\n`;
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  const generated = await readFile(targetPath, 'utf8').catch(() => '');
  if (generated !== canonical) {
    throw new Error(
      'React Native extension manifest is stale; run `npm run sync:extension-manifest`.'
    );
  }
  console.log('React Native extension manifest matches the canonical archive manifest.');
} else {
  await writeFile(targetPath, canonical);
  console.log(`Updated ${path.relative(packageRoot, targetPath)}.`);
}
