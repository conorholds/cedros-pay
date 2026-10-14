import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { createTempDir, removeTempDir, git, workspaceFiles } from './validation-fixtures.mjs';

test('release fixture inputs include working changes and omit deleted and ignored files', (t) => {
  const fixture = createTempDir('cedros-fixture-inputs-');
  t.after(() => removeTempDir(fixture));
  git(fixture, 'init', '--quiet');
  writeFileSync(join(fixture, '.gitignore'), 'ignored\n');
  writeFileSync(join(fixture, 'tracked'), 'original');
  writeFileSync(join(fixture, 'deleted'), 'original');
  git(fixture, 'add', '-A');
  writeFileSync(join(fixture, 'tracked'), 'modified');
  unlinkSync(join(fixture, 'deleted'));
  writeFileSync(join(fixture, 'untracked\nfile'), 'new');
  writeFileSync(join(fixture, 'ignored'), 'not an input');

  assert.deepEqual(workspaceFiles(fixture).sort(), ['.gitignore', 'tracked', 'untracked\nfile']);
});
