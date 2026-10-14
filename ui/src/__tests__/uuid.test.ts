import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateUUID } from '../utils/uuid';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateUUID', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses native crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => '123e4567-e89b-42d3-a456-426614174000',
    });

    expect(generateUUID()).toBe('123e4567-e89b-42d3-a456-426614174000');
  });

  it('generates an RFC4122 v4 UUID from crypto.getRandomValues', () => {
    let nextByte = 0;
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = nextByte;
          nextByte = (nextByte + 17) % 256;
        }
        return bytes;
      },
    });

    const uuid = generateUUID();

    expect(uuid).toMatch(uuidPattern);
    expect(uuid[14]).toBe('4');
    expect(['8', '9', 'a', 'b']).toContain(uuid[19].toLowerCase());
  });

  it('throws when secure random values are unavailable', () => {
    vi.stubGlobal('crypto', undefined);

    expect(() => generateUUID()).toThrow(
      'Secure UUID generation requires crypto.randomUUID or crypto.getRandomValues'
    );
  });
});
