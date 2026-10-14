import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  canonicalContainerArgs,
  cargoReleaseBuildArgs,
  releaseComponentPath,
} from '../build-release-wasm.mjs';
import {
  assertWasmBinaryHygiene,
  releasePathRemapFlags,
} from '../lib/wasm-release-hygiene.mjs';
import { root } from '../lib/validation-helpers.mjs';

const paths = {
  repositoryRoot: '/Users/builder/checkout with spaces',
  homeDirectory: '/Users/builder',
  cargoHome: '/opt/cargo-cache',
};

test('build arguments carry deterministic path remaps without shell parsing', () => {
  const flags = releasePathRemapFlags(paths);
  assert.deepEqual(flags, [
    '--remap-path-prefix=/Users/builder=/build-home',
    '--remap-path-prefix=/opt/cargo-cache=/cargo-home',
    '--remap-path-prefix=/Users/builder/checkout with spaces=/workspace',
  ]);
  const args = cargoReleaseBuildArgs(paths);
  assert.equal(args[0], '--config');
  assert.ok(args.includes('--locked'));
  assert.deepEqual(JSON.parse(args[1].slice('build.rustflags='.length)), flags);
});

test('canonical builder pins Linux amd64, its image, and read-only source', () => {
  const args = canonicalContainerArgs('/tmp/cedros output');
  assert.deepEqual(args.slice(0, 4), ['run', '--rm', '--platform', 'linux/amd64']);
  assert.ok(args.includes(`${root}:/workspace:ro`));
  assert.ok(args.includes('/tmp/cedros output:/output'));
  assert.ok(args.some((arg) => arg.startsWith('rust@sha256:')));
  const command = args.at(-1);
  assert.match(command, /apt-get install -y --no-install-recommends clang=[^ ]+ wasi-libc=[^ ]+ libclang-rt-dev-wasm32=[^ ]+ >\/dev\/null &&/u);
  assert.match(command, /rustup target add wasm32-wasip2 >\/dev\/null &&/u);
  assert.match(command, /CFLAGS_wasm32_wasip2='-isystem \/usr\/include\/wasm32-wasi -ftls-model=local-exec'/u);
  assert.match(command, /--remap-path-prefix=\/workspace=\/workspace/u);
  assert.match(command, /CARGO_BUILD_JOBS=1 CARGO_TARGET_DIR=/u);
  assert.match(command, /build --locked --manifest-path server-wasm\/Cargo\.toml/u);
  assert.match(command, /--target wasm32-wasip2 --release/u);
});

test('package and Wasmtime entrypoints use the sanitized release builder', () => {
  const makefile = readFileSync(resolve(root, 'Makefile'), 'utf8');
  assert.equal(
    makefile.match(/^\s*node scripts\/build-release-wasm\.mjs$/gm)?.length,
    2,
  );
  assert.doesNotMatch(
    makefile,
    /cargo build .*cedros-pay-extension-guest.*wasm32-wasip2.*--release/,
  );
  assert.equal(releaseComponentPath, resolve(root, 'cedros-extension.server.wasm'));
});

test('accepts remapped build paths and harmless parser labels', () => {
  assert.doesNotThrow(() => assertWasmBinaryHygiene(
    Buffer.from('/workspace/domain/src/lib.rs\0/build-home/.cargo/registry\0PRIVATE KEY'),
    paths,
  ));
});

test('rejects developer paths across macOS and Linux builds', () => {
  for (const path of [
    '/Users/other/project/src/lib.rs',
    '/home/runner/work/project/src/lib.rs',
    paths.repositoryRoot,
    paths.homeDirectory,
  ]) {
    assert.throws(
      () => assertWasmBinaryHygiene(Buffer.from(path), paths),
      /release Wasm contains/,
      path,
    );
  }
});

test('rejects private keys and production secret tokens', () => {
  for (const marker of [
    '-----BEGIN PRIVATE KEY-----',
    `sk_live_${'a'.repeat(24)}`,
    `whsec_${'b'.repeat(24)}`,
    `AKIA${'C'.repeat(16)}`,
  ]) {
    assert.throws(
      () => assertWasmBinaryHygiene(Buffer.from(marker), paths),
      /release Wasm contains/,
      marker,
    );
  }
});
