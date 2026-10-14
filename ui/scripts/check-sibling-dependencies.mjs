#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const forbiddenPackages = [
  '@cedros/shop',
  '@cedros/giftcards',
  '@cedros/gift-cards',
  '@cedros/tokenization',
  'cedros-shop',
  'cedros-giftcards',
  'cedros-gift-cards',
  'cedros-tokenization',
];

const manifestFiles = [
  'package.json',
  'package-lock.json',
  'react-native/package.json',
  'react-native/package-lock.json',
  '../server-wasm/Cargo.toml',
  '../server-wasm/Cargo.lock',
];

const sourceRoots = [
  'src',
  'react-native/src',
  '../server-wasm/domain/src',
];

const adminSourceRoots = [
  'src/components/admin',
  'src/utils',
];

const importPattern = /\b(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
const ignoredDirs = new Set(['node_modules', 'dist', 'target', '.git']);
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.rs']);
const failures = [];

function report(message) {
  failures.push(message);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function walkFiles(relativeRoot, files = []) {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return files;

  for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;

    const absolutePath = path.join(absoluteRoot, entry.name);
    const relativePath = path.relative(ROOT, absolutePath).replaceAll(path.sep, '/');

    if (entry.isDirectory()) {
      walkFiles(relativePath, files);
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }

  return files;
}

function importSpecifiers(text) {
  const specs = [];
  let match;
  while ((match = importPattern.exec(text)) !== null) {
    specs.push(match[1]);
  }
  importPattern.lastIndex = 0;
  return specs;
}

function checkManifestReferences() {
  for (const relativePath of manifestFiles) {
    if (!exists(relativePath)) continue;
    const text = readText(relativePath);
    for (const packageName of forbiddenPackages) {
      if (text.includes(packageName)) {
        report(`${relativePath} references forbidden sibling package ${packageName}`);
      }
    }
  }
}

function checkSourceImports() {
  for (const root of sourceRoots) {
    for (const relativePath of walkFiles(root)) {
      const text = readText(relativePath);
      for (const specifier of importSpecifiers(text)) {
        if (forbiddenPackages.includes(specifier)) {
          report(`${relativePath} imports forbidden sibling package ${specifier}`);
        }
      }
    }
  }
}

function checkAdminBoundaries() {
  const forbiddenAdminImports = [
    '#compat/shopReact',
    '#compat/giftcardsReact',
    '#compat/tokenizationReact',
  ];

  for (const root of adminSourceRoots) {
    for (const relativePath of walkFiles(root)) {
      const text = readText(relativePath);
      for (const specifier of importSpecifiers(text)) {
        if (forbiddenAdminImports.includes(specifier) || specifier.includes('/ecommerce')) {
          report(`${relativePath} imports extracted storefront/domain namespace ${specifier}`);
        }
      }
    }
  }
}

function checkPublicEntrypoints() {
  const pkg = readJson('package.json');
  if (pkg.exports && Object.prototype.hasOwnProperty.call(pkg.exports, './ecommerce')) {
    report('package.json exports ./ecommerce; cedros-shop should own storefront packages');
  }

  if (exists('src/index.ts') && readText('src/index.ts').includes('export * as ecommerce')) {
    report('src/index.ts exports the ecommerce namespace from the root package');
  }

  if (exists('vite.config.ts') && readText('vite.config.ts').includes('ecommerce/index')) {
    report('vite.config.ts builds ecommerce/index as a public library entry');
  }
}

function checkBuiltArtifacts() {
  const forbiddenDistPaths = [
    'dist/ecommerce',
    'dist/src/ecommerce',
    'dist/src/compat/giftcardsReact.d.ts',
    'dist/src/compat/shopCart.d.ts',
    'dist/src/compat/shopFaq.d.ts',
    'dist/src/compat/shopInventory.d.ts',
    'dist/src/compat/shopReact.d.ts',
    'dist/src/compat/tokenizationReact.d.ts',
  ];

  for (const relativePath of forbiddenDistPaths) {
    if (exists(relativePath)) {
      report(`${relativePath} is present in dist; legacy storefront/domain artifacts must not ship`);
    }
  }
}

function checkLegacySourceArtifacts() {
  const forbiddenSourcePaths = [
    'src/ecommerce',
    'src/compat/giftcardsReact.tsx',
    'src/compat/shopCart.tsx',
    'src/compat/shopFaq.tsx',
    'src/compat/shopInventory.ts',
    'src/compat/shopReact.tsx',
    'src/compat/tokenizationReact.tsx',
    'react-native/src/ecommerce',
    'react-native/src/compat/shopReactNative.ts',
  ];

  for (const relativePath of forbiddenSourcePaths) {
    if (exists(relativePath)) {
      report(`${relativePath} is present in source; cedros-shop/giftcards/tokenization should own it`);
    }
  }
}

checkManifestReferences();
checkSourceImports();
checkAdminBoundaries();
checkPublicEntrypoints();
checkBuiltArtifacts();
checkLegacySourceArtifacts();

if (failures.length > 0) {
  console.error('[sibling-deps] Forbidden cedros-shop/giftcards/tokenization tie detected:');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log('[sibling-deps] No forbidden cedros-shop/giftcards/tokenization ties detected.');
