import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { maskJsCommentsAndLiterals, stripJsComments } from './javascript-source-mask.mjs';
import { assert, root } from './validation-helpers.mjs';

export const distArchivePrefix = 'workspace/react/dist';

const distRoot = resolve(root, 'ui/dist');
const runtimePackageRoot = 'workspace/react';
const runtimePackageJsonEntry = `${runtimePackageRoot}/package.json`;
const nativeDistRoot = resolve(root, 'ui/react-native');
const nativeRuntimePackageRoot = 'workspace/react-native';
const nativeRuntimePackageJsonEntry = `${nativeRuntimePackageRoot}/package.json`;
const maxHostInstalledStateBytes = 1280 * 1024;
const distRuntimeSeeds = new Set([
  'admin/register.mjs',
  'web/register.mjs',
  'pay-react.css',
]);
const distDirExcludes = new Set(['testing', 'src']);
const runtimeFileExtensions = new Map([
  ['.js', 'module'],
  ['.mjs', 'module'],
  ['.css', 'style'],
  ['.json', 'json'],
]);
const distRuntimeImportPattern = /(?:\bfrom|\bimport\s*\(|\bimport|\brequire\s*\()\s*["']([^"']+)["']/g;
const adminRuntimeImportShims = new Set([
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'cedros:admin',
]);

export function buildRuntimePackageJson(manifest, reactPackage) {
  assert(
    reactPackage.name === manifest.packageFamily.react.packageName,
    'react package name mismatch for runtime package descriptor',
  );
  const descriptor = {
    name: reactPackage.name,
    version: reactPackage.version,
    type: 'module',
    private: true,
    exports: {
      './admin/register': './dist/admin/register.mjs',
      './web/register': './dist/web/register.mjs',
      './style.css': './dist/pay-react.css',
    },
    sideEffects: ['*.css'],
  };
  return `${JSON.stringify(descriptor, null, 2)}\n`;
}

export function buildNativeRuntimePackageJson(manifest, nativePackage) {
  assert(
    nativePackage.name === manifest.packageFamily.reactNative.packageName,
    'native package name mismatch for runtime package descriptor',
  );
  assert(
    nativePackage.version === manifest.packageFamily.reactNative.version,
    'native package version mismatch for runtime package descriptor',
  );
  const target = readPackageExportTarget(nativePackage.exports?.['./register']);
  assert(target?.startsWith('./'), 'native package must export a package-relative ./register');
  const descriptor = {
    name: nativePackage.name,
    version: nativePackage.version,
    type: 'module',
    private: true,
    exports: {
      './register': target,
    },
  };
  return `${JSON.stringify(descriptor, null, 2)}\n`;
}

export function collectRuntimeDistFiles() {
  const entries = new Map();
  for (const relPath of collectRuntimeDistPaths()) {
    const firstSegment = relPath.split('/')[0];
    if (distDirExcludes.has(firstSegment)) continue;
    if (/\.(map|d\.ts|d\.mts|d\.cts)$/.test(relPath)) continue;
    entries.set(`${distArchivePrefix}/${relPath}`, readFileSync(join(distRoot, relPath)));
  }
  return entries;
}

export function collectNativeRuntimeFiles(nativePackage) {
  const target = readPackageExportTarget(nativePackage.exports?.['./register']);
  assert(target, 'native package must export ./register');
  const entryPath = target.replace(/^\.\//, '');
  assert(
    /\.(mjs|js)$/.test(entryPath),
    `native registration target must be ESM (.js or .mjs): ${entryPath}`,
  );

  const entries = new Map();
  for (const relPath of collectRelativeRuntimePaths(nativeDistRoot, entryPath)) {
    entries.set(
      `${nativeRuntimePackageRoot}/${relPath}`,
      readFileSync(join(nativeDistRoot, relPath)),
    );
  }
  return entries;
}

export function verifyRuntimePackage(entries, manifest, reactPackage) {
  const runtimePackage = readRuntimePackageDescriptor(entries);
  verifyRuntimePackageDescriptor(runtimePackage, manifest, reactPackage);
  const adminEntryPath = verifyRuntimeSurfaceEntrypoint(entries, runtimePackage, './admin/register');
  const webEntryPath = verifyRuntimeSurfaceEntrypoint(entries, runtimePackage, './web/register');
  verifyAdminRuntimeBundle(entries, adminEntryPath);
  verifyWebRuntimeBundle(entries, webEntryPath);
  verifyNoCommonJsRuntimeEntries(entries);
  verifyMetadataChunksStayDeclarative(entries);
  verifyRuntimeImportRewriteCompatibility(entries);
  const browserSafeEsmFiles = verifyRuntimeBrowserSafety(entries);
  return {
    browserSafeEsmFiles,
    hostInstalledStateBytes: verifyHostInstalledStateBudget(entries, manifest, {
      admin: adminEntryPath,
      web: webEntryPath,
    }),
    importViolations: verifyRuntimeImports(entries),
  };
}

export function verifyNativeRuntimePackage(entries, manifest, nativePackage) {
  const archivedPackage = JSON.parse(entryText(entries.get(nativeRuntimePackageJsonEntry)));
  assert(archivedPackage.name === nativePackage.name, `${nativeRuntimePackageJsonEntry} name mismatch`);
  assert(archivedPackage.version === nativePackage.version, `${nativeRuntimePackageJsonEntry} version mismatch`);
  assert(
    archivedPackage.name === manifest.packageFamily.reactNative.packageName,
    'native runtime package name mismatch',
  );
  assert(
    archivedPackage.version === manifest.packageFamily.reactNative.version,
    'native runtime package version mismatch',
  );

  const target = readPackageExportTarget(archivedPackage.exports?.['./register']);
  assert(target, `${nativeRuntimePackageJsonEntry} must export ./register`);
  const entryPath = `${nativeRuntimePackageRoot}/${target.replace(/^\.\//, '')}`;
  assert(
    /\.(mjs|js)$/.test(entryPath),
    `${entryPath} must be the native ESM runtime entry`,
  );
  assert(
    entries.has(entryPath),
    `native registration target missing from archive: ${entryPath}`,
  );

  const filePaths = collectArchiveRuntimePaths(entries, entryPath, nativeRuntimePackageRoot);
  return { entryPath, filePaths };
}

function collectRuntimeDistPaths() {
  assert(existsSync(distRoot), 'ui/dist not found; run `npm --prefix ui run build` before packaging');
  const paths = new Set();
  const stack = [...distRuntimeSeeds];
  while (stack.length > 0) {
    const relPath = stack.pop();
    if (!relPath || paths.has(relPath)) continue;
    assert(existsSync(join(distRoot, relPath)), `runtime dist file missing: ${relPath}`);
    paths.add(relPath);
    if (!/\.(mjs|js|cjs)$/.test(relPath)) continue;
    const text = readFileSync(join(distRoot, relPath), 'utf8');
    distRuntimeImportPattern.lastIndex = 0;
    let match;
    while ((match = distRuntimeImportPattern.exec(text)) !== null) {
      const imported = resolveDistImport(relPath, match[1]);
      if (imported && !paths.has(imported)) stack.push(imported);
    }
  }
  return [...paths].sort();
}

function collectRelativeRuntimePaths(runtimeRoot, entryPath) {
  const paths = new Set();
  const stack = [entryPath];
  while (stack.length > 0) {
    const relPath = stack.pop();
    if (!relPath || paths.has(relPath)) continue;
    const absolutePath = join(runtimeRoot, relPath);
    assert(existsSync(absolutePath), `native runtime dist file missing: ${relPath}`);
    paths.add(relPath);
    if (!/\.(mjs|js)$/.test(relPath)) continue;
    const text = readFileSync(absolutePath, 'utf8');
    for (const specifier of relativeRuntimeImports(text)) {
      const imported = resolveRelativeRuntimeImport(runtimeRoot, relPath, specifier);
      if (imported && !paths.has(imported)) stack.push(imported);
    }
  }
  return [...paths].sort();
}

function collectArchiveRuntimePaths(entries, entryPath, packageRoot, eagerOnly = false) {
  const paths = new Set();
  const stack = [entryPath];
  while (stack.length > 0) {
    const path = stack.pop();
    if (!path || paths.has(path)) continue;
    const content = entries.get(path);
    assert(content !== undefined, `native runtime import missing from archive: ${path}`);
    paths.add(path);
    if (!/\.(mjs|js)$/.test(path)) continue;
    for (const specifier of relativeRuntimeImports(entryText(content), eagerOnly)) {
      const imported = resolveArchiveRuntimeImport(entries, path, packageRoot, specifier);
      if (imported && !paths.has(imported)) stack.push(imported);
    }
  }
  return [...paths].sort();
}

function relativeRuntimeImports(text, eagerOnly = false) {
  const imports = [];
  const pattern = eagerOnly ? /(?:\bfrom|\bimport)\s*["']([^"']+)["']/g : distRuntimeImportPattern;
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(stripJsComments(text))) !== null) {
    if (match[1].startsWith('.')) imports.push(match[1]);
  }
  return imports;
}

function runtimeImportCandidates(fromPath, specifier) {
  const base = join(dirname(fromPath), specifier).replace(/\\/g, '/');
  assert(!base.startsWith('../'), `native runtime import escapes its package: ${specifier}`);
  return [
    base,
    `${base}.mjs`,
    `${base}.js`,
    `${base}.json`,
    `${base}/index.mjs`,
    `${base}/index.js`,
  ];
}

function resolveRelativeRuntimeImport(runtimeRoot, fromPath, specifier) {
  return runtimeImportCandidates(fromPath, specifier)
    .find((candidate) => existsSync(join(runtimeRoot, candidate))) ?? null;
}

function resolveArchiveRuntimeImport(entries, fromPath, packageRoot, specifier) {
  const packageRelativePath = fromPath.slice(`${packageRoot}/`.length);
  const candidate = runtimeImportCandidates(packageRelativePath, specifier)
    .find((relativePath) => entries.has(`${packageRoot}/${relativePath}`));
  if (candidate) return `${packageRoot}/${candidate}`;
  const unresolvedPath = `${packageRoot}/${runtimeImportCandidates(packageRelativePath, specifier)[0]}`;
  assert(false, `native runtime import missing from archive: ${unresolvedPath}`);
}

function resolveDistImport(fromPath, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = join(dirname(fromPath), specifier).replace(/\\/g, '/');
  for (const candidate of [base, `${base}.mjs`, `${base}.js`, `${base}.cjs`, `${base}.css`, `${base}/index.mjs`, `${base}/index.js`]) {
    if (existsSync(join(distRoot, candidate))) return candidate;
  }
  return null;
}

function readRuntimePackageDescriptor(entries) {
  const content = entries.get(runtimePackageJsonEntry);
  assert(content, `${runtimePackageJsonEntry} is missing`);
  return JSON.parse(entryText(content));
}

function verifyRuntimePackageDescriptor(runtimePackage, manifest, reactPackage) {
  assert(runtimePackage.name === reactPackage.name, `${runtimePackageJsonEntry} name mismatch`);
  assert(runtimePackage.version === reactPackage.version, `${runtimePackageJsonEntry} version mismatch`);
  assert(runtimePackage.name === manifest.packageFamily.react.packageName, 'runtime package name mismatch');
  assert(runtimePackage.exports?.['./style.css'] === './dist/pay-react.css', 'runtime package missing ./style.css export');
}

function verifyRuntimeSurfaceEntrypoint(entries, runtimePackage, exportKey) {
  const exportTarget = readPackageExportTarget(runtimePackage.exports?.[exportKey]);
  assert(exportTarget, `${runtimePackageJsonEntry} must export ${exportKey}`);
  const entryPath = `${runtimePackageRoot}/${exportTarget.replace(/^\.\//, '')}`;
  assert(entries.has(entryPath), `${exportKey} target missing from archive: ${entryPath}`);
  assert(entryPath.endsWith('.mjs'), `${entryPath} must be the browser ESM runtime entry`);
  return entryPath;
}

function readPackageExportTarget(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  for (const condition of ['browser', 'import', 'default', 'module']) {
    const target = readPackageExportTarget(value[condition]);
    if (target) return target;
  }
  return null;
}

function verifyAdminRuntimeBundle(entries, adminEntryPath) {
  const adminEntryText = entryText(entries.get(adminEntryPath));
  for (const exportName of ['default', 'registerCedrosAdminSurface']) {
    assert(
      adminEntryText.includes(exportName),
      `admin/register bundle is missing export "${exportName}"; bootstrap contract requires it`,
    );
  }
  // Rollup facades can inject styles through eager imports, but never lazy chunks.
  const startup = collectArchiveRuntimePaths(entries, adminEntryPath, runtimePackageRoot, true);
  verifyAdminRuntimeSelfStyles(startup.map((path) => entryText(entries.get(path))).join('\n'));
}

function verifyWebRuntimeBundle(entries, webEntryPath) {
  const webEntryText = entryText(entries.get(webEntryPath));
  for (const exportName of ['default', 'registerCedrosWebSurface']) {
    assert(webEntryText.includes(exportName), `web/register bundle is missing export "${exportName}"`);
  }
}

function verifyAdminRuntimeSelfStyles(adminEntryText) {
  for (const sentinel of [
    'cedros-pay-admin-styles',
    '.cedros-admin__tab',
    '.cedros-admin__table',
    '.cedros-admin__payment-card',
  ]) {
    assert(
      adminEntryText.includes(sentinel),
      `admin/register bundle must self-inject admin styles; missing "${sentinel}"`,
    );
  }
}

function verifyNoCommonJsRuntimeEntries(entries) {
  const cjsEntries = [...entries.keys()].filter(
    (entryName) => entryName.startsWith(`${distArchivePrefix}/`) && entryName.endsWith('.js'),
  );
  assert(
    cjsEntries.length === 0,
    `ZIP-contained runtime must include the ESM closure only; remove CommonJS entries:\n  ${cjsEntries.join('\n  ')}`,
  );
}

const unsupportedNodeGlobals = [
  ['process', /\bprocess\s*\./u],
  ['Buffer', /\b(?:new\s+)?Buffer\s*(?:[.(])/u],
  ['require', /\brequire\s*\(/u],
  ['module', /\bmodule\s*\./u],
  ['global', /\bglobal\s*\./u],
  ['__dirname', /\b__dirname\b/u],
  ['__filename', /\b__filename\b/u],
];

/** Mirror Cedros platform's static Node-global rejection for browser ESM. */
export function verifyRuntimeBrowserSafety(entries) {
  const violations = [];
  let esmFileCount = 0;

  for (const [entryName, content] of entries) {
    if (!entryName.startsWith(`${distArchivePrefix}/`)) continue;
    if (!/\.(mjs|js)$/.test(entryName)) continue;
    esmFileCount += 1;
    const executableSource = maskJsCommentsAndLiterals(entryText(content));
    const unsupported = unsupportedNodeGlobals.find(([, pattern]) =>
      pattern.test(executableSource)
    );
    if (unsupported) {
      violations.push(`${entryName} references unsupported Node global ${unsupported[0]}`);
    }
  }

  assert(
    violations.length === 0,
    `browser runtime ESM must not reference Node globals:\n  ${violations.join('\n  ')}`,
  );
  return esmFileCount;
}

/** Return bare runtime imports that the packaged host cannot provide. */
export function verifyRuntimeImports(entries) {
  const bareImportPattern = /(?:\bfrom|\bimport\s*\(|\bimport)\s*["']([a-zA-Z@_][^"']*)["']/g;
  const seen = new Set();
  const violations = [];
  for (const [entryName, content] of entries) {
    if (!entryName.startsWith(`${distArchivePrefix}/`)) continue;
    if (!/\.(mjs|js|cjs)$/.test(entryName)) continue;
    const text = stripJsComments(entryText(content));
    bareImportPattern.lastIndex = 0;
    let match;
    while ((match = bareImportPattern.exec(text)) !== null) {
      const specifier = match[1];
      if (adminRuntimeImportShims.has(specifier)) continue;
      const key = `${entryName}::${specifier}`;
      if (seen.has(key)) continue;
      seen.add(key);
      violations.push(`${entryName} imports non-shim runtime dependency "${specifier}"`);
    }
  }
  return violations;
}

function verifyMetadataChunksStayDeclarative(entries) {
  const importPattern = /(?:\bfrom|\bimport\s*\(|\brequire\s*\()\s*["']([^"']+)["']/g;
  const violations = [];
  for (const [entryName, content] of entries) {
    if (!entryName.startsWith(`${distArchivePrefix}/manifest-`)) continue;
    if (!/\.(mjs|js|cjs)$/.test(entryName)) continue;
    const text = stripJsComments(entryText(content));
    importPattern.lastIndex = 0;
    let match;
    while ((match = importPattern.exec(text)) !== null) {
      if (/^\.\/plugin-[^/]+\.(mjs|js|cjs)$/.test(match[1])) {
        violations.push(`${entryName} imports executable admin chunk "${match[1]}"`);
      }
    }
  }
  assert(
    violations.length === 0,
    `metadata manifest chunks must stay declarative:\n  ${violations.join('\n  ')}`,
  );
}

function verifyRuntimeImportRewriteCompatibility(entries) {
  const hostImportPattern =
    /(\bfrom\s*["']|import\s*\(\s*["']|import\s+["'])([a-zA-Z0-9@_./:#-]+)(["'])/g;
  const violations = [];
  for (const [entryName, content] of entries) {
    if (!entryName.startsWith(`${distArchivePrefix}/`)) continue;
    if (!/\.(mjs|js|cjs)$/.test(entryName)) continue;
    const text = stripJsComments(entryText(content));
    hostImportPattern.lastIndex = 0;
    let match;
    while ((match = hostImportPattern.exec(text)) !== null) {
      const specifier = match[2];
      if (adminRuntimeImportShims.has(specifier)) continue;
      if (specifier.startsWith('.') || specifier.startsWith('/')) continue;
      violations.push(`${entryName} has non-rewritable runtime import match "${specifier}"`);
    }
  }
  assert(
    violations.length === 0,
    `runtime files must be compatible with the Cedros platform ZIP import rewriter:\n  ${violations
      .slice(0, 20)
      .join('\n  ')}${violations.length > 20 ? `\n  ...and ${violations.length - 20} more` : ''}`,
  );
}

function verifyHostInstalledStateBudget(entries, manifest, surfaceEntryPaths) {
  const runtimeArchive = {
    packageName: manifest.packageFamily.react.packageName,
    packageRoot: runtimePackageRoot,
    surfaceEntryPaths,
    entryPath: surfaceEntryPaths.admin ?? surfaceEntryPaths.web,
    files: collectHostRuntimeArchiveFiles(entries),
  };
  const stateBody = {
    installedExtensions: [{
      extensionId: manifest.extensionId,
      installed: true,
      enabled: true,
      selectedVersion: manifest.version,
      manifest,
      source: {
        kind: 'bundle',
        label: 'Local package archive',
        reference: `${manifest.extensionId}-${manifest.version}.cedros-extension.zip`,
      },
      runtimeArchive,
      removable: true,
      actions: ['enable', 'disable', 'upgrade', 'remove'],
    }],
  };
  const bytes = Buffer.byteLength(JSON.stringify(stateBody));
  assert(
    bytes <= maxHostInstalledStateBytes,
    `host installed-state request estimate ${bytes} exceeds ${maxHostInstalledStateBytes}; trim ZIP-contained runtime files`,
  );
  return bytes;
}

function collectHostRuntimeArchiveFiles(entries) {
  return [...entries.entries()].flatMap(([entryName, content]) => {
    if (!entryName.startsWith(`${runtimePackageRoot}/`)) return [];
    if (entryName.endsWith('.map')) return [];
    const kind = readRuntimeFileKind(entryName);
    return kind ? [{ path: entryName, kind, text: entryText(content) }] : [];
  });
}

function readRuntimeFileKind(entryName) {
  for (const [extension, kind] of runtimeFileExtensions) {
    if (entryName.endsWith(extension)) return kind;
  }
  return null;
}

function entryText(content) {
  return Buffer.isBuffer(content) ? content.toString('utf8') : String(content ?? '');
}
