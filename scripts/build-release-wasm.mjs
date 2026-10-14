#!/usr/bin/env node
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assert, root } from './lib/validation-helpers.mjs';
import {
  assertWasmBinaryHygiene,
  releasePathRemapFlags,
} from './lib/wasm-release-hygiene.mjs';

const cargoArtifactPath = resolve(
  root,
  'server-wasm/target/wasm32-wasip2/release/cedros_pay_extension_guest.wasm',
);
export const releaseComponentPath = resolve(root, 'cedros-extension.server.wasm');
const canonicalImage = 'rust@sha256:5c38a9e735664861e84ce6918e98ce7f05dbac210230d45381bcf870b2d58083';
const canonicalArtifact = 'cedros_pay_extension_guest.wasm';
const canonicalNativePackages = [
  'clang=1:14.0-55.7~deb12u1',
  'wasi-libc=0.0~git20220510.9886d3d-2',
  'libclang-rt-dev-wasm32=1:14.0-55.7~deb12u1',
].join(' ');

export function cargoReleaseBuildArgs(options) {
  const rustflags = JSON.stringify(releasePathRemapFlags(options));
  return [
    '--config',
    `build.rustflags=${rustflags}`,
    'build',
    '--locked',
    '--manifest-path',
    'server-wasm/Cargo.toml',
    '-p',
    'cedros-pay-extension-guest',
    '--target',
    'wasm32-wasip2',
    '--release',
  ];
}

/** Runs the release build in the pinned Linux/amd64 toolchain used by CI. */
export function canonicalContainerArgs(outputDirectory) {
  const command = [
    'apt-get update >/dev/null &&',
    `apt-get install -y --no-install-recommends ${canonicalNativePackages} >/dev/null &&`,
    'rustup target add wasm32-wasip2 >/dev/null &&',
    "CFLAGS_wasm32_wasip2='-isystem /usr/include/wasm32-wasi -ftls-model=local-exec'",
    'CARGO_BUILD_JOBS=1 CARGO_TARGET_DIR=/tmp/cedros-target cargo',
    '--config \'build.rustflags=["--remap-path-prefix=/root=/build-home","--remap-path-prefix=/usr/local/cargo=/cargo-home","--remap-path-prefix=/workspace=/workspace"]\'',
    'build --locked --manifest-path server-wasm/Cargo.toml',
    '-p cedros-pay-extension-guest --target wasm32-wasip2 --release',
    `&& cp /tmp/cedros-target/wasm32-wasip2/release/${canonicalArtifact} /output/${canonicalArtifact}`,
  ].join(' ');
  return [
    'run', '--rm', '--platform', 'linux/amd64',
    '--volume', `${root}:/workspace:ro`,
    '--volume', `${outputDirectory}:/output`,
    '--workdir', '/workspace',
    canonicalImage,
    'bash', '-c', command,
  ];
}

function buildCanonicalWasm() {
  const contextDirectory = resolve(root, '.context');
  mkdirSync(contextDirectory, { recursive: true });
  const outputDirectory = mkdtempSync(resolve(contextDirectory, 'canonical-wasm-'));
  try {
    const result = spawnSync('docker', canonicalContainerArgs(outputDirectory), {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    assert(result.status === 0, `canonical release Wasm build failed with status ${result.status}`);
    const builtArtifact = resolve(outputDirectory, canonicalArtifact);
    assert(existsSync(builtArtifact), 'canonical release builder did not produce the component');
    mkdirSync(resolve(cargoArtifactPath, '..'), { recursive: true });
    copyFileSync(builtArtifact, cargoArtifactPath);
    copyFileSync(builtArtifact, releaseComponentPath);
  } finally {
    rmSync(outputDirectory, { recursive: true, force: true });
  }
}

function main() {
  buildCanonicalWasm();
  assert(existsSync(releaseComponentPath), 'release Wasm build did not produce the expected component');
  assertWasmBinaryHygiene(readFileSync(releaseComponentPath));
  console.log(`release Wasm hygiene passed: ${releaseComponentPath}`);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
