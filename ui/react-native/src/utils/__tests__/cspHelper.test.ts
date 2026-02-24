/**
 * Tests for CSP helper utility
 *
 * Regression test for SEC-002:
 * - Verify 'self' appears in frame-src across all presets
 * - Verify crypto-only mode excludes Stripe but includes 'self'
 */

import { describe, it, expect } from 'vitest';
import { generateCSPDirectives } from '../cspHelper';

describe('generateCSPDirectives', () => {
  it('should include "self" in frame-src by default', () => {
    const directives = generateCSPDirectives();

    expect(directives.frameSrc).toContain("'self'");
  });

  it('should include "self" in frame-src with Stripe enabled', () => {
    const directives = generateCSPDirectives({ includeStripe: true });

    expect(directives.frameSrc).toContain("'self'");
    expect(directives.frameSrc).toContain('https://js.stripe.com');
    expect(directives.frameSrc).toContain('https://checkout.stripe.com');
  });

  it('should include "self" in frame-src for crypto-only mode', () => {
    const directives = generateCSPDirectives({ includeStripe: false });

    expect(directives.frameSrc).toContain("'self'");
    expect(directives.frameSrc).not.toContain('https://js.stripe.com');
    expect(directives.frameSrc).not.toContain('https://checkout.stripe.com');
  });

  it('should include "self" with additional frame-src domains', () => {
    const directives = generateCSPDirectives({
      additionalFrameSrc: ['https://embed.example.com'],
    });

    expect(directives.frameSrc).toContain("'self'");
    expect(directives.frameSrc).toContain('https://embed.example.com');
  });

  it('should always place "self" first in frame-src', () => {
    const directives = generateCSPDirectives({
      includeStripe: true,
      additionalFrameSrc: ['https://embed.example.com'],
    });

    expect(directives.frameSrc[0]).toBe("'self'");
  });

  it('should include Solana RPC endpoints in connect-src', () => {
    const directives = generateCSPDirectives({ solanaCluster: 'mainnet-beta' });

    expect(directives.connectSrc).toContain('https://api.mainnet-beta.solana.com');
    // SECURITY: We intentionally do NOT use wildcards like *.solana.com
    // Only the specific RPC endpoint for the selected cluster is added
  });

  it('should include custom RPC endpoint in connect-src', () => {
    const directives = generateCSPDirectives({
      solanaCluster: 'mainnet-beta',
      solanaEndpoint: 'https://mainnet.helius-rpc.com',
    });

    expect(directives.connectSrc).toContain('https://mainnet.helius-rpc.com');
  });

  it('should include Stripe domains when enabled', () => {
    const directives = generateCSPDirectives({ includeStripe: true });

    expect(directives.scriptSrc).toContain('https://js.stripe.com');
    expect(directives.connectSrc).toContain('https://api.stripe.com');
    expect(directives.connectSrc).toContain('https://*.stripe.com');
  });

  it('should exclude Stripe domains when disabled', () => {
    const directives = generateCSPDirectives({ includeStripe: false });

    expect(directives.scriptSrc).not.toContain('https://js.stripe.com');
    expect(directives.connectSrc).not.toContain('https://api.stripe.com');
    expect(directives.connectSrc).not.toContain('https://*.stripe.com');
  });
});
