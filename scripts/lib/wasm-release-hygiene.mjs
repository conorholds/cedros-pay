import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { assert, root } from './validation-helpers.mjs';

const secretPatterns = [
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'PEM private key'],
  [/\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/, 'Stripe live secret'],
  [/\bwhsec_[A-Za-z0-9]{16,}\b/, 'Stripe webhook secret'],
  [/\bAKIA[A-Z0-9]{16}\b/, 'AWS access key'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/, 'GitHub token'],
  [/\bnpm_[A-Za-z0-9]{20,}\b/, 'npm token'],
  [/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/, 'Slack token'],
];

function normalized(path) {
  return resolve(path).replace(/\\/g, '/').replace(/\/$/, '');
}

/** Returns deterministic rustc path-remapping flags for release Wasm builds. */
export function releasePathRemapFlags({
  repositoryRoot = root,
  homeDirectory = homedir(),
  cargoHome = process.env.CARGO_HOME,
} = {}) {
  const mappings = new Map([
    [normalized(repositoryRoot), '/workspace'],
    [normalized(homeDirectory), '/build-home'],
  ]);
  if (cargoHome) mappings.set(normalized(cargoHome), '/cargo-home');
  return [...mappings]
    // rustc applies the last matching prefix, so specific paths must come last.
    .sort(([left], [right]) => left.length - right.length)
    .map(([from, to]) => `--remap-path-prefix=${from}=${to}`);
}

/** Fails when a release Wasm binary contains local paths or credential material. */
export function assertWasmBinaryHygiene(bytes, {
  repositoryRoot = root,
  homeDirectory = homedir(),
} = {}) {
  const text = Buffer.from(bytes).toString('latin1');
  const localPaths = [
    [normalized(repositoryRoot), 'current workspace path'],
    [normalized(homeDirectory), 'current home path'],
  ];
  for (const [path, label] of localPaths) {
    assert(!text.includes(path), `release Wasm contains ${label}`);
  }
  assert(!text.includes('/Users/'), 'release Wasm contains a macOS user path');
  assert(!/\/home\/[^/\0\s]+\//.test(text), 'release Wasm contains a Linux user path');
  for (const [pattern, label] of secretPatterns) {
    assert(!pattern.test(text), `release Wasm contains ${label}`);
  }
}
