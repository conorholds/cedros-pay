#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'esm');

await fs.mkdir(OUT_DIR, { recursive: true });
await build({
  absWorkingDir: ROOT,
  bundle: true,
  entryPoints: {
    register: 'src/register.ts',
  },
  entryNames: '[name]',
  chunkNames: 'chunks/[name]-[hash]',
  format: 'esm',
  legalComments: 'none',
  logLevel: 'info',
  outdir: OUT_DIR,
  packages: 'external',
  platform: 'neutral',
  sourcemap: true,
  sourcesContent: false,
  splitting: true,
  target: 'es2020',
  tsconfig: path.join(ROOT, 'tsconfig.json'),
});

await fs.writeFile(
  path.join(OUT_DIR, 'package.json'),
  `${JSON.stringify({ type: 'module' }, null, 2)}\n`
);
