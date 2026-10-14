import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import test from 'node:test';
import formatter from 'sprintf-js';

test('formatter preserves positional and named formatting through the local override', () => {
  assert.equal(formatter.sprintf('%.2f %s', 1.25, 'ready'), '1.25 ready');
  assert.equal(formatter.sprintf('%(prog)s: ready', { prog: 'api-extractor' }), 'api-extractor: ready');
  assert.equal(formatter.vsprintf('%s %d', ['count', 3]), 'count 3');
});

test('extreme precision produces bounded output without an uncaught exception', () => {
  for (const type of ['e', 'f', 'g']) {
    for (const precision of ['101', '999999999999999999999999999999999999999999']) {
      const value = formatter.sprintf(`%.${precision}${type}`, 1.25);
      assert.equal(typeof value, 'string');
      assert.ok(value.length <= 110, value);
    }
  }
  assert.equal(formatter.sprintf('%.0g', 1.25), '1');
  assert.equal(formatter.sprintf('%.0f', 1.25), '1');
  assert.equal(formatter.sprintf('%.100f', 1).length, 102);
});

test('locked local formatter link identifies its source package and license', () => {
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
  const entry = lock.packages['node_modules/sprintf-js'];
  assert.equal(entry.link, true);
  const recorded = lock.packages[entry.resolved];
  const source = JSON.parse(readFileSync(new URL(entry.resolved + '/package.json', new URL('../', import.meta.url)), 'utf8'));
  assert.equal(recorded.name ?? basename(entry.resolved), source.name);
  assert.equal(recorded.version, source.version);
  assert.equal(recorded.license, 'BSD-3-Clause');
});
