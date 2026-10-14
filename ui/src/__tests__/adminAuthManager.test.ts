import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminApiError, AdminAuthManager } from '../components/admin/AdminAuthManager';

vi.mock('../utils/fetchWithTimeout', () => ({
  fetchWithTimeout: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { fetchWithTimeout } from '../utils/fetchWithTimeout';

describe('AdminAuthManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing or non-admin Login authentication without requesting a nonce', async () => {
    const manager = new AdminAuthManager('https://api.example.com');
    expect(manager.isAuthenticated()).toBe(false);
    await expect(manager.createAuthHeaders()).rejects.toThrow('Sign in as admin');
    manager.setCedrosLoginAuth('buyer-token', false);
    await expect(manager.fetchWithAuth('/admin/stats')).rejects.toThrow('No admin authentication');
    expect(fetchWithTimeout).not.toHaveBeenCalled();
    expect(manager).not.toHaveProperty('setWalletSigner');
  });

  it('uses host-session auth without bearer or nonce headers when explicitly enabled', async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        category: 'stripe',
        config: {},
        updatedAt: null,
        secretsRedacted: true,
      }),
    } as Response);

    const manager = new AdminAuthManager('https://data.example.com/extensions/cedros-pay');
    manager.setHostSessionAuth(true);

    const response = await manager.fetchWithAuth<{ category: string }>(
      '/admin/config/stripe'
    );

    expect(response).toMatchObject({ category: 'stripe' });
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
    // 'include' (not 'same-origin'): the admin SPA and the data API can sit on
    // different origins, where 'same-origin' drops the host session cookie and
    // every admin call 401s. The host's CORS allowlist + admin-trusted-origin
    // CSRF checks gate which cross-origin callers are accepted.
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      'https://data.example.com/extensions/cedros-pay/admin/config/stripe',
      expect.objectContaining({
        credentials: 'include',
        headers: {},
      })
    );
  });

  it('keeps same-origin credentials for bearer-authenticated requests', async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    const manager = new AdminAuthManager('https://api.example.com');
    manager.setCedrosLoginAuth('jwt-token', true);

    await manager.fetchWithAuth<{ ok: boolean }>('/admin/stats');

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/admin/stats',
      expect.objectContaining({
        credentials: 'same-origin',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }),
      })
    );
  });

  it('surfaces the wasm error envelope message instead of the bare status code', async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          error: { code: 'unauthorized', message: 'admin authentication required' },
        }),
    } as Response);

    const manager = new AdminAuthManager('https://data.example.com/extensions/cedros-pay');
    manager.setHostSessionAuth(true);

    await expect(
      manager.fetchWithAuth('/admin/config/stripe')
    ).rejects.toThrow('admin authentication required');
  });

  it.each([401, 403, 503])('preserves HTTP %i for recovery without parsing message text', async (status) => {
    vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
      ok: false,
      status,
      json: async () => ({ error: { message: 'Request rejected' } }),
    } as Response);
    const manager = new AdminAuthManager('https://api.example.com');
    manager.setHostSessionAuth(true);
    const request = manager.fetchWithAuth('/admin/stats');
    await expect(request).rejects.toBeInstanceOf(AdminApiError);
    await expect(request).rejects.toMatchObject({ status, message: 'Request rejected' });
  });

  it('coalesces GETs and invalidates cached reads after a successful mutation', async () => {
    vi.mocked(fetchWithTimeout)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ version: 1 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ saved: true }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ version: 2 }),
      } as Response);
    const manager = new AdminAuthManager('https://api.example.com');
    manager.setCedrosLoginAuth('jwt-token', true);

    const [first, duplicate] = await Promise.all([
      manager.fetchWithAuth<{ version: number }>('/admin/config/shop'),
      manager.fetchWithAuth<{ version: number }>('/admin/config/shop'),
    ]);
    expect(first).toEqual({ version: 1 });
    expect(duplicate).toEqual({ version: 1 });
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);

    await manager.fetchWithAuth('/admin/config/shop', { method: 'PATCH', body: '{}' });
    await expect(manager.fetchWithAuth('/admin/config/shop')).resolves.toEqual({ version: 2 });
    expect(fetchWithTimeout).toHaveBeenCalledTimes(3);
  });

  it('refetches financial state after a mutation times out after provider acceptance', async () => {
    vi.mocked(fetchWithTimeout)
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'paid' })))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'refunded' })));
    const manager = new AdminAuthManager('https://api.example.com');
    manager.setHostSessionAuth(true);
    await manager.fetchWithAuth('/admin/transactions');
    await expect(manager.fetchWithAuth('/admin/stripe/refunds/pay/process', { method: 'POST' }))
      .rejects.toThrow('timeout');
    await expect(manager.fetchWithAuth('/admin/transactions')).resolves.toEqual({ status: 'refunded' });
    expect(fetchWithTimeout).toHaveBeenCalledTimes(3);
  });

  it('surfaces failed refreshes instead of returning an apparently fresh cached payment', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(fetchWithTimeout)
        .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'paid' })))
        .mockRejectedValueOnce(new Error('offline'));
      const manager = new AdminAuthManager('https://api.example.com');
      manager.setHostSessionAuth(true);
      await manager.fetchWithAuth('/admin/transactions');
      vi.advanceTimersByTime(3000);
      await expect(manager.fetchWithAuth('/admin/transactions')).rejects.toThrow('offline');
    } finally {
      vi.useRealTimers();
    }
  });
});
