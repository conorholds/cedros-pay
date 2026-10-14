import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildNativeRuntimePackageJson,
  buildRuntimePackageJson,
} from './extension-runtime-package.mjs';
import { root } from './validation-helpers.mjs';

const evidenceVersion = 1;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readBytes(path) {
  return readFileSync(resolve(root, path));
}

function readJsonFile(path) {
  return JSON.parse(readBytes(path).toString('utf8'));
}

function git(args, fallback = '') {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : fallback;
}

function repositoryUrl() {
  const fromGit = git(['config', '--get', 'remote.origin.url']);
  const fromPackage = readJsonFile('ui/package.json').repository?.url ?? '';
  const raw = fromGit || fromPackage || 'https://github.com/conorholds/cedros-pay';
  return raw.replace(/^git\+/, '').replace(/\.git$/, '');
}

/** Resolves immutable package provenance from the reviewed source pointer. */
export function resolveReviewedSourceIdentity(releaseInputs, runGit) {
  const reviewed = String(releaseInputs?.reviewedSourceCommit ?? '');
  if (!/^[a-f0-9]{8,40}$/.test(reviewed)) {
    throw new Error('release inputs reviewedSourceCommit must be 8-40 lowercase hex characters');
  }
  const revision = runGit(['rev-parse', `${reviewed}^{commit}`]);
  if (!/^[a-f0-9]{40}$/.test(revision)) {
    throw new Error(`could not resolve reviewed source commit ${reviewed}`);
  }
  const timestamp = runGit(['show', '-s', '--format=%cI', revision]);
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) {
    throw new Error(`reviewed source commit ${reviewed} has an invalid commit timestamp`);
  }
  return { revision, timestamp };
}

function reviewedSourceIdentity() {
  return resolveReviewedSourceIdentity(
    readJsonFile('cedros-extension.release-inputs.json'),
    (args) => git(args),
  );
}

function assertCleanReleaseSource() {
  if (process.env.CEDROS_REQUIRE_CLEAN_RELEASE_EVIDENCE !== '1') return;
  const status = git(['status', '--porcelain', '--untracked-files=no']);
  if (status) {
    throw new Error('release supply-chain evidence requires a clean tracked worktree; commit or stash changes before packaging');
  }
}

function encodePurlName(name) {
  return name.split('/').map(encodeURIComponent).join('/');
}

function npmNameFromPath(path, rootName) {
  if (path === '') return rootName;
  const parts = path.split('/node_modules/').pop()?.split('/') ?? [];
  if (parts[0]?.startsWith('@')) return `${parts[0]}/${parts[1] ?? ''}`;
  return parts[0] ?? '';
}

function addComponent(components, component) {
  const key = `${component.type}:${component.purl ?? component.name}@${component.version ?? ''}`;
  const existing = components.get(key);
  if (!existing) {
    components.set(key, component);
    return;
  }
  const paths = new Set([
    ...(existing.properties ?? []).filter((p) => p.name === 'cedros:path').map((p) => p.value),
    ...(component.properties ?? []).filter((p) => p.name === 'cedros:path').map((p) => p.value),
  ]);
  existing.properties = [
    ...(existing.properties ?? []).filter((p) => p.name !== 'cedros:path'),
    ...[...paths].sort().map((value) => ({ name: 'cedros:path', value })),
  ];
}

function collectNpmComponents(path, packageRef, components) {
  const lock = readJsonFile(path);
  const rootName = lock.packages?.['']?.name ?? lock.name ?? packageRef;
  for (const [packagePath, info] of Object.entries(lock.packages ?? {})) {
    if (!info.version) continue;
    const name = info.name ?? npmNameFromPath(packagePath, rootName);
    if (!name) continue;
    addComponent(components, {
      type: packagePath === '' ? 'application' : 'library',
      name,
      version: info.version,
      purl: `pkg:npm/${encodePurlName(name)}@${encodeURIComponent(info.version)}`,
      properties: [
        { name: 'cedros:ecosystem', value: 'npm' },
        { name: 'cedros:package-ref', value: packageRef },
        { name: 'cedros:path', value: packagePath || '.' },
      ],
    });
  }
}

function collectCargoComponents(path, packageRef, components) {
  const text = readBytes(path).toString('utf8');
  for (const block of text.split(/\n\[\[package\]\]\n/).slice(1)) {
    const name = block.match(/^name = "([^"]+)"/m)?.[1];
    const version = block.match(/^version = "([^"]+)"/m)?.[1];
    if (!name || !version) continue;
    const checksum = block.match(/^checksum = "([^"]+)"/m)?.[1];
    const properties = [
      { name: 'cedros:ecosystem', value: 'cargo' },
      { name: 'cedros:package-ref', value: packageRef },
    ];
    if (checksum) properties.push({ name: 'cargo:checksum', value: checksum });
    addComponent(components, {
      type: name.startsWith('cedros-pay') ? 'application' : 'library',
      name,
      version,
      purl: `pkg:cargo/${encodeURIComponent(name)}@${encodeURIComponent(version)}`,
      properties,
    });
  }
}

function collectComponents() {
  const components = new Map();
  collectNpmComponents('ui/package-lock.json', 'react', components);
  collectNpmComponents('ui/react-native/package-lock.json', 'reactNative', components);
  collectCargoComponents('server-wasm/Cargo.lock', 'serverWasm', components);
  return [...components.values()].sort((a, b) => a.name.localeCompare(b.name) || String(a.version).localeCompare(String(b.version)));
}

function fileSubject(path, name = path) {
  const bytes = readBytes(path);
  return { name, digest: { sha256: sha256(bytes) }, size: bytes.byteLength };
}

function bytesSubject(bytes, name) {
  return { name, digest: { sha256: sha256(bytes) }, size: Buffer.byteLength(bytes) };
}

function evidenceSubjects(manifest) {
  const wasm = 'cedros-extension.server.wasm';
  const reactPackage = readJsonFile('ui/package.json');
  const nativePackage = readJsonFile('ui/react-native/package.json');
  const subjects = [
    {
      name: 'cedros-extension.manifest.json',
      digest: { sha256: sha256(`${JSON.stringify(manifest, null, 2)}\n`) },
    },
    fileSubject(wasm, 'cedros-extension.server.wasm'),
    bytesSubject(buildRuntimePackageJson(manifest, reactPackage), 'workspace/react/package.json'),
    bytesSubject(
      buildNativeRuntimePackageJson(manifest, nativePackage),
      'workspace/react-native/package.json',
    ),
    fileSubject('server-wasm/Cargo.lock', 'workspace/server-wasm/Cargo.lock'),
  ];
  return subjects.filter((subject) => subject.digest.sha256);
}

function deterministicUuid(seed) {
  const hex = sha256(seed).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function buildSbom(manifest, sourceRevision, timestamp) {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${deterministicUuid(`${manifest.extensionId}:${manifest.version}:${sourceRevision}`)}`,
    version: evidenceVersion,
    metadata: {
      timestamp,
      tools: [{ vendor: 'Cedros Pay', name: 'scripts/package-extension.mjs' }],
      component: {
        type: 'application',
        name: manifest.extensionId,
        version: manifest.version,
        purl: `pkg:generic/${manifest.extensionId}@${manifest.version}`,
      },
    },
    components: collectComponents(),
  };
}

function buildProvenance(manifest, sourceRevision, timestamp, subjects) {
  return {
    _type: 'https://in-toto.io/Statement/v1',
    subject: subjects.map(({ name, digest }) => ({ name, digest })),
    predicateType: 'https://slsa.dev/provenance/v1',
    predicate: {
      buildDefinition: {
        buildType: 'https://cedros.dev/extension/local-package/v1',
        externalParameters: {
          command: 'make cedros-package',
          extensionId: manifest.extensionId,
          version: manifest.version,
        },
        resolvedDependencies: [{ uri: repositoryUrl(), digest: { gitCommit: sourceRevision } }],
      },
      runDetails: {
        builder: { id: 'cedros-pay:scripts/package-extension.mjs' },
        metadata: { invocationId: `${manifest.extensionId}-${manifest.version}-${sourceRevision}`, finishedOn: timestamp },
      },
    },
  };
}

function buildChecksums(subjects, extraEntries) {
  const lines = subjects.map((subject) => `${subject.digest.sha256}  ${subject.name}`);
  for (const [name, bytes] of extraEntries) lines.push(`${sha256(bytes)}  ${name}`);
  return `${lines.sort().join('\n')}\n`;
}

export function buildSupplyChainEntries(manifest) {
  assertCleanReleaseSource();
  if (!existsSync(resolve(root, 'cedros-extension.server.wasm'))) {
    throw new Error('server Wasm artifact must be built before generating supply-chain evidence');
  }
  const { revision: sourceRevision, timestamp } = reviewedSourceIdentity();
  const subjects = evidenceSubjects(manifest);
  const sbom = `${JSON.stringify(buildSbom(manifest, sourceRevision, timestamp), null, 2)}\n`;
  const provenance = `${JSON.stringify(buildProvenance(manifest, sourceRevision, timestamp, subjects), null, 2)}\n`;
  const checksums = buildChecksums(subjects, [
    ['workspace/supply-chain/sbom.cdx.json', sbom],
    ['workspace/supply-chain/provenance.intoto.json', provenance],
  ]);
  return new Map([
    ['workspace/supply-chain/sbom.cdx.json', sbom],
    ['workspace/supply-chain/provenance.intoto.json', provenance],
    ['workspace/supply-chain/checksums.txt', checksums],
    ['workspace/supply-chain/source.json', `${JSON.stringify({
      repositoryUrl: repositoryUrl(),
      revision: sourceRevision,
      directory: '.',
      generatedAt: timestamp,
    }, null, 2)}\n`],
  ]);
}
