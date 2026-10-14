import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const packagedInputScopeVersion = 1;

export const packagedSourceEntries = [
  ['workspace/contracts/capacity-v1/portal-usage-capacity-v1.md', 'docs/contracts/capacity-v1/portal-usage-capacity-v1.md'],
  ['workspace/contracts/capacity-v1/portal-usage-capacity-v1.contract.json', 'docs/contracts/capacity-v1/portal-usage-capacity-v1.contract.json'],
  ['workspace/contracts/capacity-v1/fixtures/portal-usage-capacity-v1.fixtures.json', 'docs/contracts/capacity-v1/fixtures/portal-usage-capacity-v1.fixtures.json'],
  ['workspace/contracts/capacity-v1/fixtures/check_portal_usage_capacity_v1.py', 'docs/contracts/capacity-v1/fixtures/check_portal_usage_capacity_v1.py'],
  ['workspace/contracts/capacity-v1/IMPLEMENTATION.md', 'docs/contracts/capacity-v1/IMPLEMENTATION.md'],
  ['workspace/contracts/cedros-data-guarded-batch-provenance.json', 'docs/cedros-data-guarded-batch-provenance.json'],
  ['workspace/server-wasm/Cargo.lock', 'server-wasm/Cargo.lock'],
  ['workspace/source/react/tsconfig.json', 'ui/tsconfig.json'],
  ['workspace/source/react/src/admin/register.ts', 'ui/src/admin/register.ts'],
  ['workspace/source/react/src/web/register.ts', 'ui/src/web/register.ts'],
  ['workspace/source/react/src/extension/manifest.ts', 'ui/src/extension/manifest.ts'],
  ['workspace/source/react/src/extension/capabilities.ts', 'ui/src/extension/capabilities.ts'],
  ['workspace/source/react/src/extension/aiCapabilities.ts', 'ui/src/extension/aiCapabilities.ts'],
  ['workspace/source/react/src/extension/operatingCapabilities.ts', 'ui/src/extension/operatingCapabilities.ts'],
  ['workspace/source/react/src/extension/operatingSchemas.ts', 'ui/src/extension/operatingSchemas.ts'],
  ['workspace/source/react/src/extension/shippingCapabilities.ts', 'ui/src/extension/shippingCapabilities.ts'],
  ['workspace/source/react/src/extension/types.ts', 'ui/src/extension/types.ts'],
  ['workspace/source/react/src/extension/constants.ts', 'ui/src/extension/constants.ts'],
  ['workspace/source/react/src/extension/contracts.ts', 'ui/src/extension/contracts.ts'],
  ['workspace/source/react/src/extension/analytics.ts', 'ui/src/extension/analytics.ts'],
  ['workspace/source/react/src/extension/jobSchedules.ts', 'ui/src/extension/jobSchedules.ts'],
  ['workspace/source/react/src/extension/onboarding.ts', 'ui/src/extension/onboarding.ts'],
  ['workspace/source/react/src/extension/serverRouteIds.ts', 'ui/src/extension/serverRouteIds.ts'],
  ['workspace/source/react/src/extension/starters.ts', 'ui/src/extension/starters.ts'],
  ['workspace/react-native/package.json', 'ui/react-native/package.json'],
  ['workspace/react-native/tsconfig.json', 'ui/react-native/tsconfig.json'],
  ['workspace/react-native/src/register.ts', 'ui/react-native/src/register.ts'],
  ['workspace/react-native/src/extensionManifest.generated.json', 'ui/react-native/src/extensionManifest.generated.json'],
  ['workspace/react-native/src/extensionManifest.ts', 'ui/react-native/src/extensionManifest.ts'],
  ['workspace/react-native/src/extensionManifestTypes.ts', 'ui/react-native/src/extensionManifestTypes.ts'],
  ['workspace/examples/cedros-extension.ai.json', 'cedros-extension.ai.json'],
  ['workspace/examples/cedros-extension.analytics.json', 'cedros-extension.analytics.json'],
  ['workspace/examples/cedros-extension.automation.json', 'cedros-extension.automation.json'],
  ['workspace/examples/cedros-extension.host-handoff.json', 'cedros-extension.host-handoff.json'],
  ['workspace/examples/cedros-extension.site-brain.json', 'cedros-extension.site-brain.json'],
];

const exactInputs = new Set([
  'cedros-extension.manifest.json',
  'cedros-extension.bootstrap.json',
  'server-wasm/Cargo.lock',
  'ui/package.json',
  'ui/package-lock.json',
  'ui/eslint.config.mjs',
  'ui/postcss.config.cjs',
  'ui/tailwind.config.ts',
  'ui/vite.config.ts',
  'ui/react-native/package-lock.json',
  'ui/react-native/scripts/build-esm.mjs',
  'scripts/build-release-wasm.mjs',
  'scripts/package-extension.mjs',
  'scripts/lib/extension-package-inputs.mjs',
  'scripts/lib/extension-runtime-package.mjs',
  'scripts/lib/javascript-source-mask.mjs',
  'scripts/lib/supply-chain-evidence.mjs',
  'scripts/lib/supply-chain-replay.mjs',
  'scripts/lib/validation-helpers.mjs',
  'scripts/lib/wasm-release-hygiene.mjs',
  ...packagedSourceEntries.map(([, sourcePath]) => sourcePath),
]);

function isTestPath(path) {
  return path.split('/').some((part) => part === '__tests__' || part === 'tests')
    || /(?:_tests?\.rs|\.(?:test|spec)\.[cm]?[jt]sx?)$/.test(path);
}

/** Single source of truth for every file capable of changing the release archive. */
export function isPackagedInput(path) {
  if (exactInputs.has(path)) return true;
  if (path.startsWith('server-wasm/domain/src/') && !isTestPath(path)) return true;
  if (path.startsWith('server-wasm/guest/src/')) return true;
  if (path.startsWith('server-wasm/guest/wit')) return true;
  if (/^server-wasm\/(?:Cargo\.toml|domain\/Cargo\.toml|guest\/Cargo\.toml)$/.test(path)) return true;
  if (path.startsWith('ui/src/') && !isTestPath(path)) return true;
  if (path.startsWith('ui/shared/')) return true;
  if (path.startsWith('ui/vendor/bigint-buffer/') && !isTestPath(path)) return true;
  if (path.startsWith('ui/vendor/sprintf-js/') && !isTestPath(path)) return true;
  return false;
}

function workspaceFiles(repositoryRoot) {
  const result = spawnSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: repositoryRoot },
  );
  if (result.status !== 0) {
    throw new Error(`could not enumerate packaged inputs: ${result.stderr.toString('utf8').trim()}`);
  }
  return result.stdout.toString('utf8').split('\0').filter(isPackagedInput).sort();
}

export function calculatePackagedInputDigest(repositoryRoot) {
  const files = workspaceFiles(repositoryRoot);
  const hash = createHash('sha256');
  hash.update(`cedros-packaged-inputs-v${packagedInputScopeVersion}\0`);
  for (const path of files) {
    const bytes = readFileSync(resolve(repositoryRoot, path));
    hash.update(`${Buffer.byteLength(path)}:${path}\0${bytes.byteLength}:`);
    hash.update(bytes);
    hash.update('\0');
  }
  return {
    algorithm: 'sha256',
    scopeVersion: packagedInputScopeVersion,
    sha256: hash.digest('hex'),
    fileCount: files.length,
  };
}
