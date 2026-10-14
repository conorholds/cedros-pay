import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { imageSize as imageSizeEsm } from './index.mjs';

const require = createRequire(import.meta.url);
const { imageSize: imageSizeCjs } = require('./index.cjs');

function box(size, type, payload = []) {
  const result = Buffer.alloc(8 + payload.length);
  result.writeUInt32BE(size, 0);
  result.write(type, 4, 4, 'ascii');
  Buffer.from(payload).copy(result, 8);
  return result;
}

const png = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489',
  'hex'
);
assert.deepEqual(imageSizeCjs(png), { height: 1, width: 1, type: 'png' });
assert.deepEqual(imageSizeEsm(png), { height: 1, width: 1, type: 'png' });

const invalidIcns = Buffer.concat([
  Buffer.from('icns', 'ascii'),
  Buffer.from([0, 0, 0, 16]),
  Buffer.from('ic07', 'ascii'),
  Buffer.alloc(4),
]);
assert.throws(() => imageSizeCjs(invalidIcns), /invalid entry length/u);

const invalidJxl = Buffer.concat([
  box(12, 'JXL ', [0x0d, 0x0a, 0x87, 0x0a]),
  box(12, 'ftyp', Buffer.from('jxl ', 'ascii')),
  box(0, 'jxlp'),
]);
assert.throws(() => imageSizeCjs(invalidJxl), /invalid partial codestream box size/u);

const invalidHeif = Buffer.concat([
  box(12, 'ftyp', Buffer.from('avif', 'ascii')),
  box(12, 'meta', Buffer.alloc(4)),
  box(8, 'iprp'),
  box(36, 'ipco', Buffer.concat([box(0, 'ispe'), Buffer.alloc(20)])),
]);
assert.throws(() => imageSizeCjs(invalidHeif), /invalid ispe box size/u);

console.log('Patched image-size CJS/ESM dimensions and malformed-container guards passed.');
