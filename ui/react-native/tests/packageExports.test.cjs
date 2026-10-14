const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

test('native component is private and exposes only extension registration', () => {
  assert.equal(pkg.private, true);
  assert.deepEqual(Object.keys(pkg.exports), ['./register']);
  assert.equal(pkg.exports['./register'].import, './esm/register.js');
  assert.equal(pkg.exports['./register'].require, './lib/register.js');
  assert.deepEqual(pkg.dependencies ?? {}, {});
  assert.deepEqual(pkg.peerDependencies ?? {}, {});
  assert.equal(pkg.scripts.prepublishOnly, undefined);
});
