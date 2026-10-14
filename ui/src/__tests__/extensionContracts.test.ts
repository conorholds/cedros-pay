import { describe, expect, it } from 'vitest';
import { cedrosPayProviderAccess } from '../extension/access';
import { buildCedrosExtensionSurfaces } from '../extension/contracts';

describe('extension surface contracts', () => {
  it('keeps native required for local package intake when no native contributions are declared', () => {
    const surfaces = buildCedrosExtensionSurfaces();

    expect(surfaces.native.required).toBe(true);
    expect(surfaces.native.screenIds).toEqual([]);
    expect(surfaces.native.stackIds).toEqual([]);
    expect(surfaces.native.providerIds).toEqual([]);
  });

  it('requires native when native contributions are declared', () => {
    const surfaces = buildCedrosExtensionSurfaces({
      nativeScreenIds: ['cedros-pay:checkout-screen'],
    });

    expect(surfaces.native.required).toBe(true);
    expect(surfaces.native.screenIds).toEqual(['cedros-pay:checkout-screen']);
  });

  it('registers the policy-bound x402 refund provider access', () => {
    expect(cedrosPayProviderAccess).toContainEqual({
      id: 'cedros-pay:blockchain-x402-refund',
      provider: 'blockchain',
      displayName: 'x402 refund execution',
      description:
        'Requests policy-bound managed-wallet signing and broadcast for idempotent x402 Solana refunds.',
      scopes: ['blockchain.solana.refund.x402'],
      tags: ['commerce', 'onchain', 'refunds'],
    });
  });
});
