import assert from 'node:assert/strict';
import test from 'node:test';

import {
  verifyRuntimeBrowserSafety,
  verifyRuntimePackage,
  verifyRuntimeImports,
} from '../lib/extension-runtime-package.mjs';

const runtimeEntry = 'workspace/react/dist/admin/register.mjs';

test('runtime import validation accepts host-provided shims', () => {
  const entries = new Map([[
    runtimeEntry,
    Buffer.from(
      "import React from 'react';\n"
      + "import 'react/jsx-runtime';\n"
      + "import 'react/jsx-dev-runtime';\n"
      + "import 'cedros:admin';\n",
    ),
  ]]);

  assert.deepEqual(verifyRuntimeImports(entries), []);
});

test('runtime import validation rejects the deprecated package-shaped admin shim', () => {
  const packageName = '@cedros/data-react/admin';
  const entries = new Map([[
    runtimeEntry,
    Buffer.from(`import { toast } from '${packageName}';\n`),
  ]]);

  assert.deepEqual(verifyRuntimeImports(entries), [
    `${runtimeEntry} imports non-shim runtime dependency "${packageName}"`,
  ]);
});

test('runtime browser safety ignores Node-global names in comments and literals', () => {
  const entries = new Map([[
    runtimeEntry,
    Buffer.from(
      "// require('server-only')\n"
      + "const message = 'process.env.NODE_ENV Buffer.from module.exports';\n",
    ),
  ]]);

  assert.equal(verifyRuntimeBrowserSafety(entries), 1);
});

for (const [globalName, source] of [
  ['process', "process.env.NODE_ENV !== 'production';\n"],
  ['Buffer', "Buffer.from('browser-unsafe');\n"],
  ['require', "require('@emotion/is-prop-valid');\n"],
  ['module', 'module.exports = {};\n'],
  ['global', 'global.fetch = fetch;\n'],
  ['__dirname', 'const path = __dirname;\n'],
  ['__filename', 'const path = __filename;\n'],
]) {
  test(`runtime browser safety rejects ${globalName} references`, () => {
    const entries = new Map([[
      runtimeEntry,
      Buffer.from(source),
    ]]);

    assert.throws(
      () => verifyRuntimeBrowserSafety(entries),
      new RegExp(`unsupported Node global ${globalName}`),
    );
  });
}

function runtimeFixture(styleImport = 'import "./styles.mjs";') {
  const manifest = { extensionId: 'cedros-pay', version: '4.0.19',
    packageFamily: { react: { packageName: '@cedros/pay-react' } } };
  const pkg = { name: '@cedros/pay-react', version: '4.0.19' };
  const entries = new Map([
    ['workspace/react/package.json', JSON.stringify({ ...pkg, exports: {
      './admin/register': './dist/admin.mjs', './web/register': './dist/web.mjs',
      './style.css': './dist/pay-react.css',
    } })],
    ['workspace/react/dist/admin.mjs', `${styleImport} export function registerCedrosAdminSurface() {} export default registerCedrosAdminSurface;`],
    ['workspace/react/dist/web.mjs', 'export function registerCedrosWebSurface() {} export default registerCedrosWebSurface;'],
    ['workspace/react/dist/styles.mjs', 'document.head.append("cedros-pay-admin-styles .cedros-admin__tab .cedros-admin__table .cedros-admin__payment-card");'],
    ['workspace/react/dist/pay-react.css', ''],
  ]);
  return { manifest, pkg, entries };
}

test('registration facade validates styles from its eager runtime closure', () => {
  const { manifest, pkg, entries } = runtimeFixture();
  assert.doesNotThrow(() => verifyRuntimePackage(entries, manifest, pkg));
});

test('lazy or absent style imports cannot satisfy startup style injection', () => {
  for (const styleImport of ['', 'export function later() { return import("./styles.mjs"); }']) {
    const { manifest, pkg, entries } = runtimeFixture(styleImport);
    assert.throws(() => verifyRuntimePackage(entries, manifest, pkg), /must self-inject admin styles/);
  }
});
