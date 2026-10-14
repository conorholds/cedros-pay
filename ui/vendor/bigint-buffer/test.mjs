import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import bigintBuffer, {
  toBigIntBE,
  toBigIntLE,
  toBufferBE,
  toBufferLE,
} from './index.mjs';

const require = createRequire(import.meta.url);
const commonJsBuffer = require('.');

assert.equal(commonJsBuffer.toBigIntBE, toBigIntBE);
assert.equal(bigintBuffer.toBufferLE, toBufferLE);

assert.equal(toBigIntLE(Buffer.from([0xef, 0xbe, 0xad, 0xde])), 0xdeadbeefn);
assert.equal(toBigIntBE(Buffer.from([0xde, 0xad, 0xbe, 0xef])), 0xdeadbeefn);

assert.deepEqual(
  toBufferLE(0xbadc0ffee0ddf00dn, 8),
  Buffer.from([0x0d, 0xf0, 0xdd, 0xe0, 0xfe, 0x0f, 0xdc, 0xba])
);
assert.deepEqual(
  toBufferBE(0xbadc0ffee0ddf00dn, 8),
  Buffer.from([0xba, 0xdc, 0x0f, 0xfe, 0xe0, 0xdd, 0xf0, 0x0d])
);

assert.equal(toBigIntBE(Buffer.alloc(0)), 0n);
assert.deepEqual(toBufferLE(1n, 4), Buffer.from([1, 0, 0, 0]));
assert.throws(() => toBufferBE(-1n, 4), /unsigned/);
assert.throws(() => toBufferBE(1n, -1), /width/);
assert.throws(() => toBufferBE(0x123456n, 2), /exceeds width/);
assert.throws(() => toBufferLE(0x123456n, 2), /exceeds width/);
assert.throws(() => toBufferBE(1n, 0), /exceeds width/);
assert.deepEqual(toBufferBE(0n, 0), Buffer.alloc(0));
