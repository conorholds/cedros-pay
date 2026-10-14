#!/usr/bin/env node
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { archiveBootstrap } from './archive-bootstrap.mjs';
import { spawnSync } from 'node:child_process';
import { assert, assertDeepEqual, assertEqual, readJson, readText, root } from './lib/validation-helpers.mjs';
import { buildSupplyChainEntries } from './lib/supply-chain-evidence.mjs';
import { verifySupplyChainReplay } from './lib/supply-chain-replay.mjs';
import { assertWasmBinaryHygiene } from './lib/wasm-release-hygiene.mjs';
import {
  buildNativeRuntimePackageJson,
  buildRuntimePackageJson,
  collectNativeRuntimeFiles,
  collectRuntimeDistFiles,
  verifyNativeRuntimePackage,
  verifyRuntimePackage,
} from './lib/extension-runtime-package.mjs';
import { packagedSourceEntries } from './lib/extension-package-inputs.mjs';
const outputDir = resolve(root, process.argv[2] ?? 'artifacts');
const fixedDate = new Date('2026-01-01T00:00:00Z');
// Match Cedros Data's extensionPackageArchive.ts MAX_LOCAL_PACKAGE_ARCHIVE_BYTES.
// The 2 MiB bound below applies to individual non-Wasm entries, not the ZIP.
const maxZipBytes = 64 * 1024 * 1024;
// Cedros Data 41a2bd3bf, docs/extension-authoring/07-wasm-server-backends.md:
// the root component is independently bounded at 64 MiB; every other entry is
// <=2 MiB and their combined uncompressed size is <=8 MiB.
const maxComponentBytes = 64 * 1024 * 1024;
const maxNonWasmEntryBytes = 2 * 1024 * 1024;
const maxNonWasmTotalBytes = 8 * 1024 * 1024;
const maxEntries = 256;
const maxJsonEntries = 64;
const maxJsonBytes = 8 * 1024 * 1024;
// The compiled server backend (wasm32-wasip2 component) the host hot-loads from
// the archive root (13a). Built from server-wasm/ — see its Cargo.toml.
const serverComponentPath = resolve(
  root,
  'cedros-extension.server.wasm',
);
const serverComponentArchiveName = 'cedros-extension.server.wasm';
function validateArchivePath(entryName, seen) {
  assert(!entryName.startsWith('/'), `archive contains absolute path "${entryName}"`);
  assert(!entryName.includes('../'), `archive contains parent-directory path "${entryName}"`);
  assert(!entryName.includes('\\'), `archive contains backslash path "${entryName}"`);
  assert(!/(^|\/)(\.env|\.npmrc|\.ssh|id_rsa|secrets?)(\/|$)/i.test(entryName), `archive contains hidden secret path "${entryName}"`);
  const key = entryName.toLowerCase();
  assert(!seen.has(key), `archive contains duplicate case-insensitive path "${entryName}"`);
  seen.add(key);
}

function readEntryText(content) {
  return Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
}

function validatePackageDescriptors(entries) {
  const packagePathsByName = new Map();
  for (const [entryName, content] of entries) {
    if (basename(entryName) !== 'package.json') continue;
    let descriptor;
    try {
      descriptor = JSON.parse(readEntryText(content));
    } catch (cause) {
      throw new Error(`${entryName} is not valid JSON: ${cause.message}`);
    }
    if (typeof descriptor.name !== 'string') continue;
    const paths = packagePathsByName.get(descriptor.name) ?? [];
    paths.push(entryName);
    packagePathsByName.set(descriptor.name, paths);
  }
  for (const [name, paths] of packagePathsByName) {
    assert(
      paths.length === 1,
      `archive contains multiple package.json entries for ${name}: ${paths.join(', ')}`,
    );
  }
}

function verifyPackageAlignment(manifest) {
  const reactPackage = readJson('ui/package.json');
  const nativePackage = readJson('ui/react-native/package.json');
  assert(reactPackage.private === true && nativePackage.private === true, 'extension UI components must be private');
  const cargoToml = readText('server-wasm/Cargo.toml');
  assert(cargoToml.includes(`version = "${manifest.packageFamily.server.version}"`), 'server package version mismatch');
  assertEqual(reactPackage.name, manifest.packageFamily.react.packageName, 'react package name');
  assertEqual(reactPackage.version, manifest.packageFamily.react.version, 'react package version');
  assertEqual(nativePackage.name, manifest.packageFamily.reactNative.packageName, 'native package name');
  assertEqual(nativePackage.version, manifest.packageFamily.reactNative.version, 'native package version');
  assert(reactPackage.exports?.['./admin/register'], 'react package missing ./admin/register export');
  assert(reactPackage.exports?.['./web/register'], 'react package missing ./web/register export');
  assert(nativePackage.exports?.['./register'], 'native package missing ./register export');
  assertEqual(manifest.registration.admin.entrypoint, `${reactPackage.name}/admin/register`, 'admin entrypoint');
  assertEqual(manifest.registration.web.entrypoint, `${reactPackage.name}/web/register`, 'web entrypoint');
  assertEqual(manifest.registration.native.entrypoint, `${nativePackage.name}/register`, 'native entrypoint');
}
function verifySupplyChain(manifest) {
  const supplyChain = manifest.supplyChain;
  if (!supplyChain) return 'not-provided';
  for (const key of ['verified', 'marketplaceVerified', 'trusted', 'slsaLevel']) {
    assert(!Object.hasOwn(supplyChain, key), `supplyChain.${key} is computed by Cedros, not declared`);
  }
  verifyEvidencePair(supplyChain.build?.provenanceUrl, supplyChain.build?.provenanceSha256, 'build provenance');
  verifyEvidencePair(supplyChain.sbom?.url, supplyChain.sbom?.sha256, 'SBOM');
  for (const artifact of supplyChain.artifacts ?? []) {
    assert(['server', 'react', 'reactNative', undefined].includes(artifact.packageRef), `${artifact.name} has unsupported packageRef`);
    verifyEvidencePair(artifact.signatureUrl, artifact.signatureSha256, `${artifact.name} signature`);
    verifyEvidencePair(artifact.provenanceUrl, artifact.provenanceSha256, `${artifact.name} provenance`);
    verifyEvidencePair(artifact.sbomUrl, artifact.sbomSha256, `${artifact.name} SBOM`);
  }
  return 'provided-unverified';
}
function verifyEvidencePair(url, sha256, label) {
  assert(!url || sha256, `${label} URL requires a SHA-256 digest`);
  assert(!sha256 || url, `${label} digest requires a URL`);
  assert(!url || /^https:\/\//.test(url), `${label} URL must be HTTPS`);
  assert(!sha256 || /^[a-f0-9]{64}$/i.test(sha256), `${label} SHA-256 digest is invalid`);
}

function buildReadme(manifest) {
  return [
    `# ${manifest.displayName} Cedros Extension Archive`,
    '',
    `Extension: ${manifest.extensionId}@${manifest.version}`,
    '',
    'This ZIP is the self-contained Cedros extension deliverable for Cedros Data intake.',
    'It includes cedros-extension.server.wasm at the archive root and bundles the',
    'compiled React admin runtime under workspace/react/dist/** so that the host',
    'does not need to fetch npm packages, tarballs, workspaces, registries, or crates.',
    'Source files under workspace/source/react/src/ and workspace/react-native/src/',
    'are advisory copies for review only; runtime execution uses the compiled bundle.',
    'The runtime bundle contains only the admin/web dependency closure and allowed',
    'Cedros host shims; non-shim bare imports fail strict release packaging.',
    'Supply-chain SBOM, provenance, checksums, and source revision evidence are',
    'included under workspace/supply-chain/ for operator review.',
    'Routes, jobs, database, settings, secrets, telemetry, providers, and customer tags',
    'execute through the Cedros Wasm extension runtime when target-host gates pass.',
    '',
  ].join('\n');
}

function addSupplyChainEntries(entries, manifest) {
  for (const [entryName, content] of buildSupplyChainEntries(manifest)) {
    if (entries.has(entryName)) {
      throw new Error(`duplicate supply-chain entry ${entryName}`);
    }
    entries.set(entryName, content);
  }
}

function readServerComponent() {
  assert(
    existsSync(serverComponentPath),
    'server component not built; run `node scripts/build-release-wasm.mjs`',
  );
  const component = readFileSync(serverComponentPath);
  assertWasmBinaryHygiene(component);
  return component;
}

function buildEntries(manifest, bootstrap, reactPackage, nativePackage) {
  const entries = new Map([
    ['cedros-extension.manifest.json', `${JSON.stringify(manifest, null, 2)}\n`],
    ['cedros-extension.bootstrap.json', `${JSON.stringify(bootstrap, null, 2)}\n`],
    [serverComponentArchiveName, readServerComponent()],
    ['workspace/react/package.json', buildRuntimePackageJson(manifest, reactPackage)],
    ['workspace/README.md', buildReadme(manifest)],
  ]);
  for (const [entryName, sourcePath] of packagedSourceEntries) {
    entries.set(entryName, readFileSync(resolve(root, sourcePath)));
  }
  entries.set(
    'workspace/react-native/package.json',
    buildNativeRuntimePackageJson(manifest, nativePackage),
  );
  for (const [entryName, content] of collectRuntimeDistFiles()) {
    entries.set(entryName, content);
  }
  for (const [entryName, content] of collectNativeRuntimeFiles(nativePackage)) {
    entries.set(entryName, content);
  }
  addSupplyChainEntries(entries, manifest);
  return entries;
}

export function validateArchiveSizeLimits(entrySizes) {
  let totalBytes = 0;
  let nonWasmBytes = 0;
  for (const [entryName, bytes] of entrySizes) {
    if (entryName === serverComponentArchiveName) {
      assert(bytes <= maxComponentBytes, `${entryName} exceeds ${maxComponentBytes} bytes`);
    } else {
      assert(bytes <= maxNonWasmEntryBytes, `${entryName} exceeds ${maxNonWasmEntryBytes} bytes`);
      nonWasmBytes += bytes;
    }
    totalBytes += bytes;
  }
  assert(nonWasmBytes <= maxNonWasmTotalBytes,
    `archive non-Wasm bytes ${nonWasmBytes} exceeds ${maxNonWasmTotalBytes}`);
  return { totalBytes, nonWasmBytes };
}

function validateEntries(entries) {
  const seen = new Set();
  const entrySizes = [];
  let jsonBytes = 0;
  let jsonEntries = 0;
  for (const [entryName, content] of entries) {
    validateArchivePath(entryName, seen);
    const bytes = Buffer.byteLength(content);
    entrySizes.push([entryName, bytes]);
    if (entryName.endsWith('.json')) {
      jsonEntries += 1;
      jsonBytes += bytes;
    }
  }
  const { totalBytes, nonWasmBytes } = validateArchiveSizeLimits(entrySizes);
  assert(entries.size <= maxEntries, `archive has ${entries.size} entries, max ${maxEntries}`);
  assert(jsonEntries <= maxJsonEntries, `archive has ${jsonEntries} JSON entries, max ${maxJsonEntries}`);
  assert(jsonBytes <= maxJsonBytes, `archive JSON bytes ${jsonBytes} exceeds ${maxJsonBytes}`);
  validatePackageDescriptors(entries);
  return { totalBytes, nonWasmBytes, jsonEntries, jsonBytes };
}

function stageEntries(entries, stagingDir) {
  for (const [entryName, content] of [...entries.entries()].sort()) {
    const target = join(stagingDir, entryName);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    utimesSync(target, fixedDate, fixedDate);
    assert(!lstatSync(target).isSymbolicLink(), `${entryName} must not be a symlink`);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

/** Forces archive tools to encode fixed entry timestamps independently of host TZ. */
export function zipEnvironment(environment = process.env) {
  return { ...environment, TZ: 'UTC' };
}

function zipEntries(entries, stagingDir, archivePath) {
  const sortedEntries = [...entries.keys()].sort();
  run('zip', ['-X', '-q', archivePath, ...sortedEntries], {
    cwd: stagingDir,
    env: zipEnvironment(),
  });
  const listedEntries = run('unzip', ['-Z1', archivePath]).split('\n').filter(Boolean);
  assertDeepEqual(listedEntries, sortedEntries, 'archive entry list', 'archive entry list mismatch');
  assert(listedEntries.filter((entry) => entry === 'cedros-extension.manifest.json').length === 1, 'archive needs one manifest root entry');
  assert(listedEntries.filter((entry) => entry === 'cedros-extension.bootstrap.json').length === 1, 'archive needs one bootstrap root entry');
  return listedEntries;
}

function buildReleaseHandoff(manifest, archivePath, checksum, entries, supplyChainStatus) {
  const handoff = readJson('cedros-extension.host-handoff.json');
  const archiveRelativePath = relative(root, archivePath).replace(/\\/g, '/');
  return {
    schemaVersion: 1,
    extensionId: manifest.extensionId,
    version: manifest.version,
    archive: { path: archiveRelativePath, sha256: checksum, entries },
    supplyChainVerification: {
      status: supplyChainStatus === 'not-provided' ? 'sbom-present' : supplyChainStatus,
      summary: 'Author supplied local SBOM, provenance, checksums, and source revision evidence; marketplace or operator verification has not run.',
    },
    packageFamily: manifest.packageFamily,
    requiredServices: manifest.requiredServices ?? [],
    requiredCapabilities: manifest.requiredCapabilities ?? [],
    packageSourceStatus: 'Archive bundles cedros-extension.server.wasm and compiled admin runtime under workspace/react/dist/; source scaffolds are advisory.',
    hostCoordinatedItems: handoff.operatorRuntimePrerequisites ?? [],
    validationCommands: [
      'node scripts/validate-extension.mjs',
      'make cedros-package',
      'unzip -t <archive>',
    ],
    rollback: 'Disable or roll back the extension version in Cedros inventory; schedules pause and Wasm route/job calls fail closed through the selected inventory version.',
  };
}

async function main() {
  assert(existsSync(resolve(root, 'cedros-extension.manifest.json')), 'missing canonical manifest');
  assert(existsSync(resolve(root, 'cedros-extension.bootstrap.json')), 'missing canonical bootstrap');
  const manifest = readJson('cedros-extension.manifest.json');
  assertDeepEqual(readJson('cedros-extension.bootstrap.json').manifest, manifest, 'bootstrap manifest');
  verifyPackageAlignment(manifest);
  const supplyChainStatus = verifySupplyChain(manifest);
  const reactPackage = readJson('ui/package.json');
  const nativePackage = readJson('ui/react-native/package.json');
  const web = await import(pathToFileURL(resolve(root, 'ui', reactPackage.exports['./web/register'].import)).href);
  const bootstrap = archiveBootstrap(manifest, web.default());
  const entries = buildEntries(manifest, bootstrap, reactPackage, nativePackage);
  const runtimeReport = verifyRuntimePackage(entries, manifest, reactPackage);
  const nativeRuntimeReport = verifyNativeRuntimePackage(entries, manifest, nativePackage);
  const importViolations = runtimeReport.importViolations;
  const strictImports = process.env.CEDROS_STRICT_RUNTIME_IMPORTS === '1';
  if (importViolations.length > 0) {
    const banner = strictImports
      ? 'admin runtime bundle has forbidden non-shim bare imports:'
      : 'WARNING: admin runtime bundle has non-shim bare imports (host must supply these or set CEDROS_STRICT_RUNTIME_IMPORTS=1 to fail):';
    const message = `${banner}\n  ${importViolations.slice(0, 10).join('\n  ')}${importViolations.length > 10 ? `\n  ...and ${importViolations.length - 10} more` : ''}`;
    if (strictImports) throw new Error(message);
    console.warn(message);
  }
  const limits = validateEntries(entries);
  const supplyChainReplay = verifySupplyChainReplay(entries);

  mkdirSync(outputDir, { recursive: true });
  const stagingDir = mkdtempSync(join(tmpdir(), `${manifest.extensionId}-archive-`));
  const fileName = `${manifest.extensionId}-${manifest.version}.cedros-extension.zip`;
  const archivePath = resolve(outputDir, fileName);
  rmSync(archivePath, { force: true });

  try {
    stageEntries(entries, stagingDir);
    const entryList = zipEntries(entries, stagingDir, archivePath);
    const archiveBytes = readFileSync(archivePath);
    assert(archiveBytes.byteLength <= maxZipBytes, `ZIP size ${archiveBytes.byteLength} exceeds ${maxZipBytes}`);
    const checksum = createHash('sha256').update(archiveBytes).digest('hex');
    const releaseHandoff = buildReleaseHandoff(manifest, archivePath, checksum, entryList, supplyChainStatus);
    const handoffPath = resolve(outputDir, `${manifest.extensionId}-${manifest.version}.release-handoff.json`);
    writeFileSync(handoffPath, `${JSON.stringify(releaseHandoff, null, 2)}\n`);
    console.log(`${basename(archivePath)} sha256 ${checksum}`);
    console.log(`archivePath ${archivePath}`);
    console.log(`releaseHandoff ${handoffPath}`);
    console.log(`entries ${entryList.length}, uncompressedBytes ${limits.totalBytes}, nonWasmBytes ${limits.nonWasmBytes}, zipBytes ${archiveBytes.byteLength}, hostStateBytes ${runtimeReport.hostInstalledStateBytes}, nativeRuntimeFiles ${nativeRuntimeReport.filePaths.length}, checksumSubjects ${supplyChainReplay.checksumSubjects}, provenanceSubjects ${supplyChainReplay.provenanceSubjects}`);
    console.log(entryList.join('\n'));
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) await main();
