#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NPM_CACHE = path.join(ROOT, '.context', 'npm-cache');
const KNIP_VERSION = '5.88.1';
const UI_PACKAGE = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'ui', 'package.json'), 'utf8')
);
const TYPESCRIPT_VERSION =
  UI_PACKAGE.devDependencies?.typescript ?? UI_PACKAGE.dependencies?.typescript;
const TOOL_DIR = path.join(
  ROOT,
  '.context',
  'quality-tools',
  `knip-${KNIP_VERSION}-typescript-${TYPESCRIPT_VERSION}`,
);
const KNIP_BIN = path.join(
  TOOL_DIR,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'knip.cmd' : 'knip',
);
const TYPESCRIPT_PACKAGE = path.join(TOOL_DIR, 'node_modules', 'typescript', 'package.json');

const workspaces = [
  { label: 'ui', cwd: path.join(ROOT, 'ui') },
  { label: 'ui/react-native', cwd: path.join(ROOT, 'ui', 'react-native') },
];

const knipArgs = [
  '--config',
  'knip.json',
  '--include',
  'files,dependencies,unlisted,unresolved',
  '--no-config-hints',
  '--max-show-issues',
  '120',
];

fs.mkdirSync(NPM_CACHE, { recursive: true });
if (!fs.existsSync(KNIP_BIN) || !fs.existsSync(TYPESCRIPT_PACKAGE)) {
  const install = spawnSync(
    'npm',
    [
      'install',
      '--cache',
      NPM_CACHE,
      '--prefix',
      TOOL_DIR,
      '--no-save',
      '--no-package-lock',
      '--ignore-scripts',
      '--audit=false',
      '--fund=false',
      `knip@${KNIP_VERSION}`,
      `typescript@${TYPESCRIPT_VERSION}`,
    ],
    { stdio: 'inherit' },
  );
  if (install.status !== 0) process.exit(install.status ?? 1);
}

let failed = false;

for (const workspace of workspaces) {
  console.log(`[unused] ${workspace.label}`);
  const result = spawnSync(KNIP_BIN, knipArgs, {
    cwd: workspace.cwd,
    env: { ...process.env, npm_config_update_notifier: 'false' },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  console.error('[unused] Unused file or dependency check failed.');
  process.exit(1);
}

console.log('[unused] No unused files, dependencies, unlisted imports, or unresolved imports found.');
