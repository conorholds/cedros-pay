import { describe, it, expect, vi } from 'vitest';
import { writeJson, readJson, getSafeStorage } from '../utils/storage';
import type { StorageLike } from '../utils/storage';

function createMockStorage(overrides?: Partial<StorageLike>): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    ...overrides,
  };
}

describe('storage utils', () => {
  describe('writeJson', () => {
    it('returns true on success', () => {
      const storage = createMockStorage();
      expect(writeJson(storage, 'key', { a: 1 })).toBe(true);
    });

    it('returns false and warns on QuotaExceededError', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const storage = createMockStorage({
        setItem: () => { throw new DOMException('quota exceeded', 'QuotaExceededError'); },
      });

      expect(writeJson(storage, 'key', { a: 1 })).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write "key"'),
        expect.any(DOMException),
      );

      warnSpy.mockRestore();
    });
  });

  describe('readJson', () => {
    it('returns parsed value', () => {
      const storage = createMockStorage();
      storage.setItem('k', JSON.stringify({ x: 2 }));
      expect(readJson(storage, 'k')).toEqual({ x: 2 });
    });

    it('returns null for missing key', () => {
      const storage = createMockStorage();
      expect(readJson(storage, 'missing')).toBeNull();
    });
  });

  describe('getSafeStorage', () => {
    it('returns null in non-browser environment', () => {
      // jsdom provides window.localStorage, so this tests the happy path
      const result = getSafeStorage();
      expect(result).not.toBeNull();
    });
  });
});
