import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import 'react/jsx-runtime';

import { verifyRuntimeBrowserSafety } from '../../scripts/lib/extension-runtime-package.mjs';

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(uiRoot, 'dist');
const archiveManifest = JSON.parse(
  await readFile(resolve(uiRoot, '../cedros-extension.manifest.json'), 'utf8'),
);
const nodeOnlyGlobals = [
  'process',
  'Buffer',
  'global',
  'require',
  'module',
  '__dirname',
  '__filename',
];

test('packaged admin ESM imports and renders without Node globals', async () => {
  const esmFiles = await listEsmFiles(distDir);
  const runtimeEntries = new Map();
  for (const file of esmFiles) {
    runtimeEntries.set(
      `workspace/react/dist/${file.slice(distDir.length + 1)}`,
      await readFile(file),
    );
  }
  assert.equal(verifyRuntimeBrowserSafety(runtimeEntries), esmFiles.length);
  console.log(
    `checked ${esmFiles.length} packaged ESM files: no unsupported Node global references`,
  );

  const dom = new JSDOM(
    '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
    {
      pretendToBeVisual: true,
      url: 'https://admin.example.com/admin/pay-hub',
    },
  );
  const originalBrowserGlobals = installBrowserGlobals(dom.window);
  const originalNodeGlobals = hideNodeGlobals();
  const originalFetch = globalThis.fetch;
  const container = document.getElementById('root');
  assert.ok(container, 'browser test root is missing');
  const root = createRoot(container);

  try {
    globalThis.fetch = async () => ({
      ok: false,
      status: 503,
      headers: new Headers({ 'content-type': 'application/json' }),
      body: null,
      json: async () => ({}),
      text: async () => '',
    });
    for (const key of nodeOnlyGlobals) {
      assert.equal(typeof globalThis[key], 'undefined', `${key} must be absent`);
    }

    const entrypoint = await import(
      `${pathToFileURL(resolve(distDir, 'admin/register.mjs')).href}?browser-test=${Date.now()}`
    );
    console.log('imported packaged admin/register.mjs with Node globals absent');

    const bootstrap = entrypoint.default();
    assert.equal(bootstrap.manifest.version, archiveManifest.version);
    assert.deepEqual(bootstrap.manifest.packageFamily, archiveManifest.packageFamily);
    const webEntrypoint = await import(
      pathToFileURL(resolve(distDir, 'web/register.mjs')).href
    );
    const webBootstrap = webEntrypoint.default();
    assert.equal(webBootstrap.manifest.version, archiveManifest.version);
    assert.deepEqual(webBootstrap.manifest.packageFamily, archiveManifest.packageFamily);
    const adminModule = bootstrap.modules?.[0];
    assert.ok(adminModule, 'packaged bootstrap is missing its admin module');
    const SettingsHubComponent = adminModule.components?.['cedros-pay:settings-hub'];
    assert.equal(typeof SettingsHubComponent, 'function', 'packaged Pay hub component is missing');

    root.render(
      React.createElement(SettingsHubComponent, {
        pluginContext: {
          serverUrl: 'https://admin.example.com/extensions/cedros-pay',
          getAccessToken: () => null,
          hasPermission: () => true,
          dependencies: {
            cedrosBalanceInstalled: false,
          },
        },
        pageSize: 20,
        refreshInterval: 30_000,
      }),
    );
    await waitFor(() => container.textContent?.includes('Pay hub'));

    assert.match(container.textContent ?? '', /Pay hub/);
    console.log('rendered packaged cedros-pay:settings-hub section with Node globals absent');

    const DashboardCard = adminModule.contributions?.dashboardCards?.find(
      (card) => card.id === 'cedros-pay:status-card',
    )?.Component;
    assert.equal(typeof DashboardCard, 'function', 'packaged Pay dashboard card is missing');
    const injectedCss = document.getElementById('cedros-pay-admin-styles')?.textContent ?? '';
    assert.ok(injectedCss.includes('cedros-dashboard__card-footer'), 'dashboard CSS must be self-injected');
    assert.match(injectedCss, /@container\s*\(max-width:\s*360px\)/, 'card-width responsiveness must survive bundling');
    const requests = [];
    globalThis.fetch = async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ totalTransactions: 12, orders: { failed: 2 }, pendingRefunds: 3 }),
      };
    };
    root.render(React.createElement(DashboardCard, {
      hostContext: {},
      extensionId: 'cedros-pay',
      refreshInterval: 0,
      isLoading: true,
      analyticsError: 'Unrelated site analytics failure',
      analyticsSnapshot: null,
      pluginContext: {
        serverUrl: 'https://admin.example.com/extensions/cedros-pay',
        getAccessToken: () => null,
        hasPermission: () => true,
      },
    }));
    await waitFor(() => container.querySelector('[data-state="ready"]'));
    assert.deepEqual(
      [...container.querySelectorAll('.cedros-data-metric__value')].map((element) => element.textContent),
      ['12', '2', '3'],
    );
    const statsRequest = requests.find(({ url }) => url.endsWith('/admin/stats'));
    assert.equal(statsRequest?.url, 'https://admin.example.com/extensions/cedros-pay/admin/stats');
    assert.equal(statsRequest?.options.credentials, 'include');
    assert.equal(container.querySelector('a')?.getAttribute('href'), '/admin/cedros-pay:admin:cedros-pay:transactions/refunds');
    console.log('rendered packaged Pay dashboard with authenticated data, injected CSS, and refund navigation');

    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'private authentication detail' }),
    });
    root.render(React.createElement(DashboardCard, {
      hostContext: {}, extensionId: 'cedros-pay', refreshInterval: 0,
      isLoading: false, analyticsSnapshot: null,
      pluginContext: {
        serverUrl: 'https://admin.example.com/extensions/cedros-pay',
        getAccessToken: () => 'expired-token',
        hasPermission: () => true,
      },
    }));
    await waitFor(() => container.textContent?.includes('Session expired'));
    assert.equal(container.querySelectorAll('.cedros-data-metric__value').length, 0);
    assert.equal(container.querySelector('button')?.textContent, 'Reload admin');
    assert.doesNotMatch(container.textContent ?? '', /private authentication detail/);
    console.log('packaged dashboard clears protected metrics and offers session recovery after HTTP 401');
  } finally {
    root.unmount();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
    globalThis.fetch = originalFetch;
    restoreGlobals(originalNodeGlobals);
    dom.window.close();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    restoreGlobals(originalBrowserGlobals);
  }
});

async function listEsmFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return listEsmFiles(path);
      return entry.name.endsWith('.mjs') ? [path] : [];
    }),
  );
  return files.flat().sort();
}

function installBrowserGlobals(window) {
  const replacements = {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    SVGElement: window.SVGElement,
    Element: window.Element,
    Node: window.Node,
    CustomEvent: window.CustomEvent,
    MutationObserver: window.MutationObserver,
    getComputedStyle: window.getComputedStyle.bind(window),
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  };
  const originals = new Map();

  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  });

  for (const [key, value] of Object.entries(replacements)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }

  return originals;
}

function hideNodeGlobals() {
  const originals = new Map();
  for (const key of nodeOnlyGlobals) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    originals.set(key, descriptor);
    if (descriptor) {
      assert.equal(descriptor.configurable, true, `${key} must be configurable`);
      assert.equal(delete globalThis[key], true, `${key} must be removable`);
    }
  }
  return originals;
}

function restoreGlobals(originals) {
  for (const [key, descriptor] of originals) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      delete globalThis[key];
    }
  }
}

async function waitFor(predicate, timeoutMs = 2_000) {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error('packaged Pay hub component did not render');
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }
}
