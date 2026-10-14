import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNativeRuntimePackageJson,
  buildRuntimePackageJson,
  verifyNativeRuntimePackage,
} from '../lib/extension-runtime-package.mjs';

const manifest = {
  packageFamily: {
    react: {
      packageName: '@cedros/pay-react',
      version: '3.0.32',
    },
    reactNative: {
      packageName: '@cedros/pay-react-native',
      version: '3.0.32',
    },
  },
};

test('archive registration exports are official package-relative strings', () => {
  const reactRuntime = JSON.parse(buildRuntimePackageJson(manifest, {
    name: '@cedros/pay-react',
    version: '3.0.32',
  }));
  const nativeRuntime = JSON.parse(buildNativeRuntimePackageJson(manifest, nativePackage));

  assert.equal(reactRuntime.private, true);
  assert.equal(nativeRuntime.private, true);
  assert.equal(reactRuntime.exports['./admin/register'], './dist/admin/register.mjs');
  assert.equal(reactRuntime.exports['./web/register'], './dist/web/register.mjs');
  assert.equal(nativeRuntime.exports['./register'], './esm/register.js');
});

const nativePackage = {
  name: '@cedros/pay-react-native',
  version: '3.0.32',
  exports: {
    './register': {
      import: './esm/register.js',
    },
  },
};

function archiveEntries() {
  return new Map([
    ['workspace/react-native/package.json', `${JSON.stringify(nativePackage)}\n`],
  ]);
}

test('native registration export must resolve to a packaged ESM file', () => {
  assert.throws(
    () => verifyNativeRuntimePackage(archiveEntries(), manifest, nativePackage),
    /native registration target missing from archive: workspace\/react-native\/esm\/register\.js/,
  );
});

test('native registration runtime must include its transitive relative imports', () => {
  const entries = archiveEntries();
  entries.set(
    'workspace/react-native/esm/register.js',
    'import "./chunks/bootstrap.js";\nexport default function register() {}\n',
  );

  assert.throws(
    () => verifyNativeRuntimePackage(entries, manifest, nativePackage),
    /native runtime import missing from archive: workspace\/react-native\/esm\/chunks\/bootstrap\.js/,
  );

  entries.set('workspace/react-native/esm/chunks/bootstrap.js', 'export {};\n');
  assert.deepEqual(
    verifyNativeRuntimePackage(entries, manifest, nativePackage),
    {
      entryPath: 'workspace/react-native/esm/register.js',
      filePaths: [
        'workspace/react-native/esm/chunks/bootstrap.js',
        'workspace/react-native/esm/register.js',
      ],
    },
  );
});
