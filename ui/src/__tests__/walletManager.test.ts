import { WalletManager } from '../managers/WalletManager';
import type { X402Requirement } from '../types';
import { PublicKey } from '@solana/web3.js';

describe('WalletManager', () => {
  const manager = new WalletManager('devnet');

  describe('buildPaymentPayload', () => {
    it('builds payment payload from signed transaction', () => {
      const requirement: X402Requirement = {
        scheme: 'solana-spl-transfer',
        network: 'devnet',
        maxAmountRequired: '1000000',
        resource: 'article-123',
        description: 'Test article',
        mimeType: 'application/json',
        payTo: '9aXm9S9hpPJ3iJQAE6xRbdLsjqcxQZ4tAFDcTkdgBVdQ',
        maxTimeoutSeconds: 300,
        asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        extra: {
          decimals: 6,
          tokenSymbol: 'USDC',
          recipientTokenAccount: 'TokenAccountPubkey123',
        },
      };

      const signedTx = {
        signature: 'test-signature',
        serialized: 'base64-encoded-tx',
      };

      const userWallet = new PublicKey('3xqzfGYYqN2q8R7tzGqMvPxSRSgQTdghGfGXWF4j3Lk4');

      const payload = manager.buildPaymentPayload({
        requirement,
        signedTx,
        payerPublicKey: userWallet,
      });

      expect(payload).toHaveProperty('x402Version', 0);
      expect(payload).toHaveProperty('scheme', 'solana-spl-transfer');
      expect(payload).toHaveProperty('network', 'devnet');
      expect(payload.payload).toHaveProperty('signature', 'test-signature');
      expect(payload.payload).toHaveProperty('transaction', 'base64-encoded-tx');
      expect(payload.payload).toHaveProperty('payer', userWallet.toString());
    });

    it('includes memo in payment payload when provided', () => {
      const requirement: X402Requirement = {
        scheme: 'solana-spl-transfer',
        network: 'devnet',
        maxAmountRequired: '1000000',
        resource: 'article-123',
        description: 'Test article',
        mimeType: 'application/json',
        payTo: '9aXm9S9hpPJ3iJQAE6xRbdLsjqcxQZ4tAFDcTkdgBVdQ',
        maxTimeoutSeconds: 300,
        asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        extra: {
          decimals: 6,
          tokenSymbol: 'USDC',
          recipientTokenAccount: 'TokenAccountPubkey123',
          memo: 'Payment for article-123',
        },
      };

      const signedTx = {
        signature: 'test-signature',
        serialized: 'base64-encoded-tx',
      };

      const userWallet = new PublicKey('3xqzfGYYqN2q8R7tzGqMvPxSRSgQTdghGfGXWF4j3Lk4');

      const payload = manager.buildPaymentPayload({
        requirement,
        signedTx,
        payerPublicKey: userWallet,
      });

      expect(payload.payload.memo).toBe('Payment for article-123');
    });
  });

  describe('deserializeTransaction', () => {
    it('throws error for invalid base64', () => {
      expect(() => {
        manager.deserializeTransaction('invalid-base64!!!');
      }).toThrow();
    });

    it('throws error for malformed transaction data', () => {
      // Valid base64 but not a valid transaction
      expect(() => {
        manager.deserializeTransaction('YWJjZGVmZ2hpamtsbW5vcA=='); // "abcdefghijklmnop"
      }).toThrow('Failed to deserialize transaction');
    });
  });

  describe('gasless transaction support', () => {
    it('validates gasless transaction requirement structure', () => {
      const requirement: X402Requirement = {
        scheme: 'solana-spl-transfer',
        network: 'devnet',
        maxAmountRequired: '1000000',
        resource: 'article-123',
        description: 'Test article',
        mimeType: 'application/json',
        payTo: '9aXm9S9hpPJ3iJQAE6xRbdLsjqcxQZ4tAFDcTkdgBVdQ',
        maxTimeoutSeconds: 300,
        asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        extra: {
          decimals: 6,
          tokenSymbol: 'USDC',
          recipientTokenAccount: 'TokenAccountPubkey123',
          feePayer: '8xN9v3eQm9pW7Rd2JkqXfKyQ4tAFDcTkdgBVdQ1234AB',
        },
      };

      expect(requirement.extra?.feePayer).toBeDefined();
      expect(typeof requirement.extra?.feePayer).toBe('string');
      // Verify it's a valid base58 string (Solana pubkey format)
      expect(() => new PublicKey(requirement.extra!.feePayer!)).not.toThrow();
    });

    it('validates regular transaction has no feePayer in requirement', () => {
      const requirement: X402Requirement = {
        scheme: 'solana-spl-transfer',
        network: 'devnet',
        maxAmountRequired: '1000000',
        resource: 'article-123',
        description: 'Test article',
        mimeType: 'application/json',
        payTo: '9aXm9S9hpPJ3iJQAE6xRbdLsjqcxQZ4tAFDcTkdgBVdQ',
        maxTimeoutSeconds: 300,
        asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        extra: {
          decimals: 6,
          tokenSymbol: 'USDC',
          recipientTokenAccount: 'TokenAccountPubkey123',
        },
      };

      expect(requirement.extra?.feePayer).toBeUndefined();
    });
  });

  describe('payment payload structure validation', () => {
    it('creates properly structured x402 payment payload', () => {
      const requirement: X402Requirement = {
        scheme: 'solana-spl-transfer',
        network: 'mainnet-beta',
        maxAmountRequired: '5000000', // 5 USDC
        resource: 'premium-article',
        description: 'Premium content access',
        mimeType: 'application/json',
        payTo: '9aXm9S9hpPJ3iJQAE6xRbdLsjqcxQZ4tAFDcTkdgBVdQ',
        maxTimeoutSeconds: 600,
        asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        extra: {
          decimals: 6,
          tokenSymbol: 'USDC',
          recipientTokenAccount: 'RecipientATA123',
        },
      };

      const signedTx = {
        signature: '5J7z9kXqK4mWxA...',
        serialized: 'AQAAAAAAAAAa...',
      };

      const userWallet = new PublicKey('3xqzfGYYqN2q8R7tzGqMvPxSRSgQTdghGfGXWF4j3Lk4');

      const payload = manager.buildPaymentPayload({
        requirement,
        signedTx,
        payerPublicKey: userWallet,
      });

      // Validate x402 spec compliance
      expect(payload.x402Version).toBe(0);
      expect(payload.scheme).toBe(requirement.scheme);
      expect(payload.network).toBe(requirement.network);

      // Validate payload structure
      expect(payload.payload).toBeDefined();
      expect(payload.payload.signature).toBe(signedTx.signature);
      expect(payload.payload.transaction).toBe(signedTx.serialized);
      expect(payload.payload.payer).toBe(userWallet.toString());
    });
  });
});
