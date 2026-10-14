#!/usr/bin/env node
// Cedros extension WIT drift gate.
//
// The host/guest ABI (the `cedros:extension` WIT) is vendored into this repo at
// server-wasm/guest/wit/cedros-extension.wit and MUST stay byte-for-byte
// identical to the pinned cedros-data host WIT. Signature drift prevents the
// host from linking the component. This gate runs in `make cedros-package` and
// `make cedros-verify` and fails the build on drift.
//
// Checks, in order:
//   1. tamper    — sha256(vendored WIT) === recorded witSha256          [always]
//   2. version   — vendored `package cedros:extension@X` === recorded   [always]
//   3. freshness — vendored === host WIT at sourceCommit; WARN (or fail
//                  under CEDROS_WIT_STRICT=1) if the host HEAD moved on  [needs CEDROS_DATA_DIR]
//
// `--update` re-vendors the WIT from the host (CEDROS_DATA_DIR) and rewrites the
// provenance file — the only sanctioned way to change the vendored WIT.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const witPath = join(repoRoot, 'server-wasm/guest/wit/cedros-extension.wit');
const provPath = join(repoRoot, 'server-wasm/guest/wit-source.json');

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const versionOf = (buf) =>
  (buf.toString().match(/package\s+cedros:extension@([^;\s]+)\s*;/) || [])[1];
const ok = (msg) => console.log(`  ok   ${msg}`);
const fail = (lines) => {
  console.error(`\n  verify-wit FAILED\n  ${[].concat(lines).join('\n  ')}\n`);
  process.exit(1);
};

const prov = JSON.parse(readFileSync(provPath, 'utf8'));
const hostDir = process.env.CEDROS_DATA_DIR;
const hostWitAt = (ref) => execFileSync('git', ['-C', hostDir, 'show', `${ref}:${prov.sourcePath}`]);
const hostHead = () => execFileSync('git', ['-C', hostDir, 'rev-parse', 'HEAD']).toString().trim();

// --- re-vendor mode -------------------------------------------------------
if (process.argv.includes('--update')) {
  if (!hostDir) fail('--update needs CEDROS_DATA_DIR pointing at a cedros-data checkout.');
  const head = hostHead();
  const hostWit = hostWitAt('HEAD');
  writeFileSync(witPath, hostWit);
  const next = {
    ...prov,
    sourceCommit: head,
    witVersion: versionOf(hostWit) || prov.witVersion,
    witSha256: sha256(hostWit),
  };
  writeFileSync(provPath, JSON.stringify(next, null, 2) + '\n');
  console.log(`  re-vendored WIT from ${prov.sourceRepo}@${head.slice(0, 9)} (sha256 ${next.witSha256.slice(0, 12)}…)`);
  console.log('  -> regenerate bindings + prove it loads:  make cedros-verify');
  process.exit(0);
}

// --- verify mode ----------------------------------------------------------
const vendored = readFileSync(witPath);

// 1. tamper
const actual = sha256(vendored);
if (actual !== prov.witSha256) {
  fail([
    'Vendored WIT does not match its recorded provenance — it was hand-edited.',
    `expected sha256 ${prov.witSha256}`,
    `actual   sha256 ${actual}`,
    '',
    'Do not hand-edit the WIT. Re-vendor',
    'from the host instead:  make vendor-wit',
  ]);
}
ok(`WIT matches provenance (sha256 ${actual.slice(0, 12)}…, ${prov.sourceRepo}@${prov.sourceCommit.slice(0, 9)})`);

// 2. version
const ver = versionOf(vendored);
if (ver !== prov.witVersion) fail(`WIT package version ${ver ?? '(missing)'} != recorded ${prov.witVersion}.`);
ok(`WIT package ${prov.witPackage}@${prov.witVersion}`);

// 3. freshness (best-effort; needs a host checkout)
if (!hostDir) {
  console.log('  --   set CEDROS_DATA_DIR to also diff against the live host WIT');
  process.exit(0);
}
try {
  if (sha256(hostWitAt(prov.sourceCommit)) !== prov.witSha256) {
    fail(`Host WIT at pinned ${prov.sourceCommit.slice(0, 9)} != vendored — provenance is inconsistent; re-run make vendor-wit.`);
  }
  const head = hostHead();
  if (head !== prov.sourceCommit && sha256(hostWitAt('HEAD')) !== prov.witSha256) {
    const msg = `Host WIT moved ahead (pinned ${prov.sourceCommit.slice(0, 9)} -> host HEAD ${head.slice(0, 9)}). Re-vendor and re-prove the ABI:  make vendor-wit && make cedros-verify`;
    if (process.env.CEDROS_WIT_STRICT === '1') fail(msg);
    console.log(`  WARN ${msg}`);
  } else {
    ok('vendored WIT identical to the live host WIT');
  }
} catch (e) {
  console.log(`  --   could not diff against host at ${hostDir} (${String(e.message).split('\n')[0]})`);
}
process.exit(0);
