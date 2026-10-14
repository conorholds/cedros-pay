import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { packagedSourceEntries } from '../lib/extension-package-inputs.mjs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const json = (path) => JSON.parse(read(path));

test('source tree and package inputs contain only extension components', () => {
  assert.equal(existsSync(new URL('../../server-rust/Cargo.toml', import.meta.url)), false);
  for (const [archivePath, sourcePath] of packagedSourceEntries) {
    assert.equal(archivePath.startsWith('workspace/server/'), false, archivePath);
    assert.equal(existsSync(new URL(`../../${sourcePath}`, import.meta.url)), true, sourcePath);
  }
  const makefile = read('Makefile');
  assert.match(makefile, /^\.DEFAULT_GOAL := help/m);
  assert.doesNotMatch(makefile, /^(dev|db|server|stop|publish):/m);
  assert.doesNotMatch(makefile, /cargo publish|npm publish|docker run/);
  const release = json('cedros-extension.release-readiness.json');
  assert.equal(release.npmPublication.status, 'not applicable');
  assert.equal(release.npmPublication.nextAction, undefined);
});

test('UI components are private and expose only host registration surfaces', () => {
  for (const [path, exports] of [
    ['ui/package.json', ['./admin/register', './web/register', './style.css']],
    ['ui/react-native/package.json', ['./register']],
  ]) {
    const pkg = json(path);
    assert.equal(pkg.private, true, path);
    assert.deepEqual(Object.keys(pkg.exports), exports, path);
    assert.equal(pkg.main, undefined, path);
    assert.equal(pkg.scripts.prepublishOnly, undefined, path);
  }
  assert.doesNotMatch(read('ui/vite.config.ts'), /src\/(index|payments|checkout|crypto-only)\.ts/);
  assert.doesNotMatch(read('ui/react-native/scripts/build-esm.mjs'), /src\/(index|canonicalCheckout)\.ts/);
});
