import { describe, expect, it, vi } from 'vitest';
import { AdminReadCache } from '../components/admin/AdminReadCache';

vi.mock('../utils/logger', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('AdminReadCache', () => {
  it('coalesces concurrent misses and returns isolated cached values', async () => {
    let resolveLoad: ((value: { rows: string[] }) => void) | undefined;
    const load = vi.fn(() => new Promise<{ rows: string[] }>((resolve) => {
      resolveLoad = resolve;
    }));
    const cache = new AdminReadCache({ freshMs: 1000 });

    const first = cache.read('/admin/orders', load);
    const second = cache.read('/admin/orders', load);
    resolveLoad?.({ rows: ['one'] });
    const [a, b] = await Promise.all([first, second]);
    a.rows.push('local-only');

    expect(load).toHaveBeenCalledTimes(1);
    expect(b).toEqual({ rows: ['one'] });
    await expect(cache.read('/admin/orders', load)).resolves.toEqual({ rows: ['one'] });
  });

  it('records refresh failure while serving bounded stale data', async () => {
    let now = 100;
    const cache = new AdminReadCache({ freshMs: 10, staleIfErrorMs: 100, now: () => now });
    await cache.read('/admin/stats', async () => ({ count: 1 }));
    now = 120;

    await expect(cache.read('/admin/stats', async () => {
      throw new Error('offline');
    })).resolves.toEqual({ count: 1 });
    now = 1000;
    await expect(cache.read('/admin/stats', async () => {
      throw new Error('still offline');
    })).rejects.toThrow('still offline');
  });

  it('rejects old in-flight reads after identity replacement', async () => {
    let resolveLoad: ((value: { secret: string }) => void) | undefined;
    const cache = new AdminReadCache();
    const pending = cache.read('/admin/config', () => new Promise((resolve) => {
      resolveLoad = resolve;
    }));

    cache.resetIdentity();
    resolveLoad?.({ secret: 'old-identity' });
    await expect(pending).rejects.toThrow('Admin identity changed during request');
    await expect(cache.read('/admin/config', async () => ({ secret: 'new-identity' })))
      .resolves.toEqual({ secret: 'new-identity' });
  });
  it('evicts the least recently used completed entry', async () => {
    const cache = new AdminReadCache({ maxEntries: 2 });
    const a = vi.fn(async () => 'a');
    const b = vi.fn(async () => 'b');
    await cache.read('a', a);
    await cache.read('b', b);
    await cache.read('a', a);
    await cache.read('c', async () => 'c');
    await cache.read('a', a);
    await cache.read('b', b);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('bounds retention during 1000 unique reads and prunes expired entries', async () => {
    let now = 0;
    const cache = new AdminReadCache({ maxEntries: 8, freshMs: 10, staleIfErrorMs: 10, now: () => now });
    for (let i = 0; i < 1000; i += 1) await cache.read(String(i), async () => ({ rows: [i] }));
    expect(cache['entries'].size).toBe(8);
    now = 100;
    await cache.read('new', async () => 1);
    expect(cache['entries'].size).toBe(1);
  });

  it('does not evict a pending request or allow mutation-stale completion', async () => {
    const cache = new AdminReadCache({ maxEntries: 1 });
    let resolve!: (value: string) => void;
    const load = vi.fn(() => new Promise<string>((done) => { resolve = done; }));
    const first = cache.read('pending', load);
    await cache.read('a', async () => 'a');
    await cache.read('b', async () => 'b');
    const second = cache.read('pending', load);
    expect(load).toHaveBeenCalledTimes(1);
    cache.invalidate();
    resolve('stale');
    await expect(first).rejects.toThrow('Admin data changed');
    await expect(second).rejects.toThrow('Admin data changed');
    expect(cache['entries'].size).toBe(0);
  });

  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid capacity %s', (maxEntries) => {
    expect(() => new AdminReadCache({ maxEntries })).toThrow('maxEntries');
  });

});
