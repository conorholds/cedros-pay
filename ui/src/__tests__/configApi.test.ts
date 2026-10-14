import { describe, expect, it } from 'vitest';
import type { IAdminAuthManager } from '../components/admin/AdminAuthManager';
import { ConfigApiClient } from '../components/admin/configApi';

describe('ConfigApiClient Core CAS contract', () => {
  it('reuses one mutation identity across an exact retry and advances the revision', async () => {
    const requests: Array<{ path: string; options?: RequestInit }> = [];
    let mutationAttempt = 0;
    const authManager: IAdminAuthManager = {
      getAuthMethod: () => 'cedros-login',
      isAuthenticated: () => true,
      setCedrosLoginAuth: () => undefined,
      createAuthHeaders: async () => ({ Authorization: 'Bearer test' }),
      fetchWithAuth: async <T>(path: string, options?: RequestInit) => {
        requests.push({ path, options });
        if (options?.method === 'PATCH') {
          mutationAttempt += 1;
          if (mutationAttempt === 1) throw new Error('response lost');
          return {
            category: 'shop',
            updated: true,
            updatedAt: '2026-07-16T00:00:00Z',
            committedRevision: mutationAttempt === 2 ? 'revision-b' : 'revision-c',
            message: 'updated',
          } as T;
        }
        return {
          category: 'shop',
          config: {},
          updatedAt: '2026-07-16T00:00:00Z',
          committedRevision: 'revision-a',
          secretsRedacted: true,
        } as T;
      },
    };
    const client = new ConfigApiClient('https://example.test/extensions/cedros-pay', authManager);

    await client.getConfig('shop');
    await expect(client.patchConfig('shop', { enabled: true })).rejects.toThrow('response lost');
    await client.patchConfig('shop', { enabled: true });
    await client.patchConfig('shop', { enabled: false });

    const mutations = requests.filter((request) => request.options?.method === 'PATCH');
    const bodies = mutations.map((request) => JSON.parse(String(request.options?.body)));
    const headers = mutations.map(
      (request) => (request.options?.headers as Record<string, string>)['Idempotency-Key']
    );
    expect(bodies[0]).toEqual(bodies[1]);
    expect(headers[0]).toBe(headers[1]);
    expect(headers[0]).toBe(`extension-config:${bodies[0].mutationId}`);
    expect(bodies[0].expectedRevision).toBe('revision-a');
    expect(bodies[2].expectedRevision).toBe('revision-b');
    expect(bodies[2].mutationId).not.toBe(bodies[1].mutationId);
  });

  it('rejects an old configuration read after an identity change', async () => {
    let generation = 1;
    let resolveRead: ((value: unknown) => void) | undefined;
    const authManager: IAdminAuthManager = {
      getAuthMethod: () => 'cedros-login',
      isAuthenticated: () => true,
      setCedrosLoginAuth: () => undefined,
      getIdentityGeneration: () => generation,
      createAuthHeaders: async () => ({ Authorization: 'Bearer test' }),
      fetchWithAuth: <T>() => new Promise<T>((resolve) => {
        resolveRead = (value) => resolve(value as T);
      }),
    };
    const client = new ConfigApiClient('https://example.test/extensions/cedros-pay', authManager);

    const read = client.getConfig('shop');
    generation = 2;
    resolveRead?.({
      category: 'shop',
      config: {},
      updatedAt: '2026-07-16T00:00:00Z',
      committedRevision: 'old-revision',
      secretsRedacted: true,
    });

    await expect(read).rejects.toThrow('identity changed');
  });

  it('starts a new mutation from the revision observed after an authoritative reload', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    let revision = 'revision-a';
    let fail = true;
    const authManager: IAdminAuthManager = {
      getAuthMethod: () => 'cedros-login',
      isAuthenticated: () => true,
      setCedrosLoginAuth: () => undefined,
      createAuthHeaders: async () => ({ Authorization: 'Bearer test' }),
      fetchWithAuth: async <T>(_path: string, options?: RequestInit) => {
        if (options?.method === 'PATCH') {
          bodies.push(JSON.parse(String(options.body)) as Record<string, unknown>);
          if (fail) {
            fail = false;
            throw new Error('conflict');
          }
          return { committedRevision: 'revision-c' } as T;
        }
        return {
          category: 'shop',
          config: {},
          updatedAt: '2026-07-16T00:00:00Z',
          committedRevision: revision,
          secretsRedacted: true,
        } as T;
      },
    };
    const client = new ConfigApiClient('https://example.test/extensions/cedros-pay', authManager);

    await client.getConfig('shop');
    await expect(client.patchConfig('shop', { enabled: true })).rejects.toThrow('conflict');
    revision = 'revision-b';
    await client.getConfig('shop');
    await client.patchConfig('shop', { enabled: true });

    expect(bodies[0].expectedRevision).toBe('revision-a');
    expect(bodies[1].expectedRevision).toBe('revision-b');
    expect(bodies[1].mutationId).not.toBe(bodies[0].mutationId);
  });
});
