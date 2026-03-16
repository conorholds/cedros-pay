import { describe, it, expect, vi, beforeEach } from 'vitest';
import bs58 from 'bs58';
import { Base64 } from 'js-base64';
import { AdminAuthManager, type WalletSigner } from '../components/admin/AdminAuthManager';

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
  const signerBytes = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
  const signatureBytes = Uint8Array.from([1, 2, 3, 4]);
  const walletSigner: WalletSigner = {
    publicKey: { toBytes: () => signerBytes },
    signMessage: vi.fn().mockResolvedValue(signatureBytes),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs the issued nonce and encodes the signature as base64', async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        nonce: 'nonce-123',
        expiresAt: 1700000000,
        purpose: 'admin_stats',
      }),
    } as Response);

    const manager = new AdminAuthManager('https://api.example.com');
    manager.setWalletSigner(walletSigner);

    const headers = await manager.createAuthHeaders({
      path: '/admin/stats',
      method: 'GET',
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      'https://api.example.com/paywall/v1/nonce',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/admin/stats', method: 'GET' }),
      })
    );

    expect(headers).toEqual({
      'X-Signer': bs58.encode(signerBytes),
      'X-Message': 'nonce-123',
      'X-Signature': Base64.fromUint8Array(signatureBytes),
    });
    expect('X-Signature' in headers && headers['X-Signature']).not.toBe(bs58.encode(signatureBytes));
  });

  it('passes the raw nonce bytes to signMessage', async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        nonce: 'expected-nonce',
        expiresAt: 1700000000,
        purpose: 'admin_stats',
      }),
    } as Response);

    const manager = new AdminAuthManager('https://api.example.com');
    manager.setWalletSigner(walletSigner);

    await manager.createAuthHeaders({
      path: '/admin/stats',
      method: 'GET',
    });

    expect(walletSigner.signMessage).toHaveBeenCalledWith(
      new TextEncoder().encode('expected-nonce')
    );
  });

  it('requests nonces using the admin route and method instead of a client-side purpose map', async () => {
    vi.mocked(fetchWithTimeout)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          nonce: 'route-derived-nonce',
          expiresAt: 1700000000,
          purpose: 'config_history',
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      } as Response);

    const manager = new AdminAuthManager('https://api.example.com');
    manager.setWalletSigner(walletSigner);

    const response = await manager.fetchWithAuth<{ ok: boolean }>('/admin/config/history');

    expect(response).toEqual({ ok: true });
    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/paywall/v1/nonce',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ path: '/admin/config/history', method: 'GET' }),
      })
    );
    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/admin/config/history',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Message': 'route-derived-nonce',
        }),
      })
    );
  });
});
