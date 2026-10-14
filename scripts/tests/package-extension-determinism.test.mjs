import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { zipEnvironment } from '../package-extension.mjs';

function archiveBytes(timezone) {
  const fixture = mkdtempSync(join(tmpdir(), 'cedros-zip-tz-'));
  try {
    const staging = join(fixture, 'staging');
    const archive = join(fixture, 'archive.zip');
    mkdirSync(staging);
    const entry = join(staging, 'entry.txt');
    writeFileSync(entry, 'deterministic archive fixture\n');
    const fixedDate = new Date('2026-01-01T00:00:00Z');
    utimesSync(entry, fixedDate, fixedDate);
    const result = spawnSync('zip', ['-X', '-q', archive, 'entry.txt'], {
      cwd: staging,
      env: zipEnvironment({ ...process.env, TZ: timezone }),
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return readFileSync(archive);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test('fixed archive entries are byte-identical across caller timezones', () => {
  assert.deepEqual(archiveBytes('UTC'), archiveBytes('America/Los_Angeles'));
});

test('zip environment always overrides the caller timezone with UTC', () => {
  assert.equal(zipEnvironment({ TZ: 'America/Los_Angeles' }).TZ, 'UTC');
});
