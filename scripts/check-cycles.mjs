#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { maskRustNonCode } from './lib/rust-source-mask.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NPM_CACHE = path.join(ROOT, '.context', 'npm-cache');
const MADGE_VERSION = '8.0.0';
const RUST_SRC = path.join(ROOT, 'server-wasm', 'domain', 'src');

const tsWorkspaces = [
  {
    label: 'ui',
    cwd: path.join(ROOT, 'ui'),
    args: ['src'],
  },
  {
    label: 'ui/react-native',
    cwd: path.join(ROOT, 'ui', 'react-native'),
    args: ['src'],
  },
];

function runMadge(workspace) {
  const args = [
    'exec',
    '--cache',
    NPM_CACHE,
    '--yes',
    `--package=madge@${MADGE_VERSION}`,
    '--',
    'madge',
    '--circular',
    '--json',
    '--extensions',
    'ts,tsx',
    '--ts-config',
    'tsconfig.json',
    ...workspace.args,
  ];

  console.log(`[cycles] ${workspace.label}`);
  const result = spawnSync('npm', args, {
    cwd: workspace.cwd,
    env: { ...process.env, npm_config_update_notifier: 'false' },
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    return false;
  }

  const cycles = JSON.parse(result.stdout);
  if (cycles.length > 0) {
    console.error(`[cycles] ${workspace.label} circular dependencies found:`);
    for (const cycle of cycles) {
      console.error(`  - ${cycle.join(' -> ')}`);
    }
    return false;
  }

  console.log(`[cycles] ${workspace.label} has no circular dependencies.`);
  return true;
}

function walkRustFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkRustFiles(absolute, files);
    } else if (entry.isFile() && entry.name.endsWith('.rs')) {
      files.push(absolute);
    }
  }
  return files;
}

function moduleId(file) {
  const relative = path.relative(RUST_SRC, file).replaceAll(path.sep, '/');
  const withoutExtension = relative.replace(/\.rs$/, '');
  if (withoutExtension === 'lib' || withoutExtension === 'main') return withoutExtension;
  if (withoutExtension.endsWith('/mod')) return withoutExtension.slice(0, -4).replaceAll('/', '::');
  return withoutExtension.replaceAll('/', '::');
}

function findTargetModule(reference, modules) {
  const parts = reference.split('::');
  for (let length = parts.length; length > 0; length -= 1) {
    const candidate = parts.slice(0, length).join('::');
    if (modules.has(candidate)) return candidate;
  }
  return null;
}

function buildRustGraph() {
  const files = walkRustFiles(RUST_SRC);
  const modules = new Map(files.map((file) => [moduleId(file), file]));
  const graph = new Map(Array.from(modules.keys(), (id) => [id, new Set()]));
  const crateRef = /\bcrate::([A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_][A-Za-z0-9_]*)*)/g;

  for (const [sourceId, file] of modules) {
    const text = maskRustNonCode(fs.readFileSync(file, 'utf8'));
    let match;
    while ((match = crateRef.exec(text)) !== null) {
      const targetId = findTargetModule(match[1], modules);
      if (targetId && targetId !== sourceId) {
        graph.get(sourceId).add(targetId);
      }
    }
    crateRef.lastIndex = 0;
  }

  return graph;
}

function stronglyConnectedComponents(graph) {
  const indexByNode = new Map();
  const lowlinkByNode = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  let nextIndex = 0;

  function visit(node) {
    indexByNode.set(node, nextIndex);
    lowlinkByNode.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of graph.get(node) ?? []) {
      if (!indexByNode.has(next)) {
        visit(next);
        lowlinkByNode.set(node, Math.min(lowlinkByNode.get(node), lowlinkByNode.get(next)));
      } else if (onStack.has(next)) {
        lowlinkByNode.set(node, Math.min(lowlinkByNode.get(node), indexByNode.get(next)));
      }
    }

    if (lowlinkByNode.get(node) === indexByNode.get(node)) {
      const component = [];
      let member;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      components.push(component.sort());
    }
  }

  for (const node of graph.keys()) {
    if (!indexByNode.has(node)) visit(node);
  }

  return components.filter((component) => component.length > 1);
}

function checkRustCycles() {
  console.log('[cycles] server-wasm/domain');
  const cycles = stronglyConnectedComponents(buildRustGraph());
  if (cycles.length === 0) {
    console.log('[cycles] server-wasm/domain has no crate-module cycles.');
    return true;
  }

  console.error('[cycles] Rust crate-module cycles found:');
  for (const cycle of cycles) {
    console.error(`  - ${cycle.join(' -> ')}`);
  }
  return false;
}

fs.mkdirSync(NPM_CACHE, { recursive: true });

let passed = true;
for (const workspace of tsWorkspaces) {
  if (!runMadge(workspace)) passed = false;
}
if (!checkRustCycles()) passed = false;

if (!passed) {
  console.error('[cycles] Cycle check failed.');
  process.exit(1);
}

console.log('[cycles] No circular dependencies found.');
