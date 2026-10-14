'use strict';

function toBigInt(hex) {
  return hex.length === 0 ? 0n : BigInt(`0x${hex}`);
}

function assertWidth(width) {
  if (!Number.isSafeInteger(width) || width < 0) {
    throw new RangeError('width must be a non-negative safe integer');
  }
}

function toUnsignedHex(num, width) {
  assertWidth(width);

  const value = BigInt(num);
  if (value < 0n) {
    throw new RangeError('num must be unsigned');
  }

  const hex = value === 0n ? '' : value.toString(16);
  const byteLength = width * 2;
  if (hex.length > byteLength) {
    throw new RangeError('num exceeds width');
  }

  return hex.padStart(byteLength, '0');
}

function toBigIntLE(buf) {
  const bytes = Buffer.from(buf);
  bytes.reverse();
  return toBigInt(bytes.toString('hex'));
}

function toBigIntBE(buf) {
  return toBigInt(Buffer.from(buf).toString('hex'));
}

function toBufferLE(num, width) {
  const bytes = Buffer.from(toUnsignedHex(num, width), 'hex');
  bytes.reverse();
  return bytes;
}

function toBufferBE(num, width) {
  return Buffer.from(toUnsignedHex(num, width), 'hex');
}

exports.toBigIntLE = toBigIntLE;
exports.toBigIntBE = toBigIntBE;
exports.toBufferLE = toBufferLE;
exports.toBufferBE = toBufferBE;
