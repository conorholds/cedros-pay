import { describe, it, expect } from 'vitest';
import {
  KNOWN_STABLECOINS,
  isKnownStablecoin,
  getStablecoinSymbol,
  validateTokenMint,
  validateX402Asset,
} from '../utils/tokenMintValidator';

describe('tokenMintValidator', () => {
  describe('KNOWN_STABLECOINS', () => {
    it('should contain all expected stablecoins', () => {
      expect(KNOWN_STABLECOINS).toEqual({
        'CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH': 'CASH',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
        '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo': 'PYUSD',
      });
    });
  });

  describe('isKnownStablecoin', () => {
    it('should return true for USDC mint', () => {
      expect(isKnownStablecoin('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(true);
    });

    it('should return true for USDT mint', () => {
      expect(isKnownStablecoin('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')).toBe(true);
    });

    it('should return true for PYUSD mint', () => {
      expect(isKnownStablecoin('2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo')).toBe(true);
    });

    it('should return true for CASH mint', () => {
      expect(isKnownStablecoin('CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH')).toBe(true);
    });

    it('should return false for unknown mint', () => {
      expect(isKnownStablecoin('UnknownMint1234567890')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isKnownStablecoin('')).toBe(false);
    });

    it('should return false for USDC with typo', () => {
      // Typo: replaced first character
      expect(isKnownStablecoin('XPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(false);
    });
  });

  describe('getStablecoinSymbol', () => {
    it('should return USDC for USDC mint', () => {
      expect(getStablecoinSymbol('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe('USDC');
    });

    it('should return USDT for USDT mint', () => {
      expect(getStablecoinSymbol('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')).toBe('USDT');
    });

    it('should return PYUSD for PYUSD mint', () => {
      expect(getStablecoinSymbol('2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo')).toBe('PYUSD');
    });

    it('should return CASH for CASH mint', () => {
      expect(getStablecoinSymbol('CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH')).toBe('CASH');
    });

    it('should return undefined for unknown mint', () => {
      expect(getStablecoinSymbol('UnknownMint1234567890')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getStablecoinSymbol('')).toBeUndefined();
    });
  });

  describe('validateTokenMint', () => {
    describe('known stablecoins', () => {
      it('should validate USDC mint without warning', () => {
        const result = validateTokenMint('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(true);
        expect(result.symbol).toBe('USDC');
        expect(result.warning).toBeUndefined();
        expect(result.error).toBeUndefined();
      });

      it('should validate USDT mint without warning', () => {
        const result = validateTokenMint('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(true);
        expect(result.symbol).toBe('USDT');
        expect(result.warning).toBeUndefined();
        expect(result.error).toBeUndefined();
      });

      it('should validate PYUSD mint without warning', () => {
        const result = validateTokenMint('2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo');
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(true);
        expect(result.symbol).toBe('PYUSD');
        expect(result.warning).toBeUndefined();
        expect(result.error).toBeUndefined();
      });

      it('should validate CASH mint without warning', () => {
        const result = validateTokenMint('CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH');
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(true);
        expect(result.symbol).toBe('CASH');
        expect(result.warning).toBeUndefined();
        expect(result.error).toBeUndefined();
      });
    });

    describe('unknown mints - STRICT MODE (default)', () => {
      it('should fail validation for unknown mint with error', () => {
        const result = validateTokenMint('UnknownMint1234567890', 'test context');
        expect(result.isValid).toBe(false); // STRICT: Invalid by default
        expect(result.isKnownStablecoin).toBe(false);
        expect(result.symbol).toBeUndefined();
        expect(result.error).toBeDefined();
        expect(result.warning).toBeUndefined();
        expect(result.error).toContain('SAFETY ERROR: Unrecognized token mint address in test context');
        expect(result.error).toContain('UnknownMint1234567890');
        expect(result.error).toContain('PERMANENT LOSS OF FUNDS');
        expect(result.error).toContain('Known stablecoin mints');
        expect(result.error).toContain('USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        expect(result.error).toContain('dangerouslyAllowUnknownMint={true}');
      });

      it('should include context in error message', () => {
        const result = validateTokenMint('CustomToken', 'CedrosConfig.tokenMint', false);
        expect(result.error).toContain('in CedrosConfig.tokenMint');
      });

      it('should use default context if not provided', () => {
        const result = validateTokenMint('CustomToken', undefined, false);
        expect(result.error).toContain('in token mint');
      });

      it('should fail for USDC with typo', () => {
        // Realistic typo scenario - STRICT mode catches this
        const result = validateTokenMint('XPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        expect(result.isValid).toBe(false);
        expect(result.isKnownStablecoin).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('XPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      });

      it('should include opt-in instructions in error', () => {
        const result = validateTokenMint('CustomToken', 'test');
        expect(result.error).toContain('dangerouslyAllowUnknownMint: true');
        expect(result.error).toContain('⚠️ WARNING: Only enable dangerouslyAllowUnknownMint if you have TRIPLE-CHECKED');
      });
    });

    describe('unknown mints - PERMISSIVE MODE (allowUnknown=true)', () => {
      it('should validate unknown mint with warning when allowUnknown=true', () => {
        const result = validateTokenMint('UnknownMint1234567890', 'test context', true);
        expect(result.isValid).toBe(true); // PERMISSIVE: Valid but warns
        expect(result.isKnownStablecoin).toBe(false);
        expect(result.symbol).toBeUndefined();
        expect(result.warning).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.warning).toContain('Warning: Unrecognized token mint address in test context');
        expect(result.warning).toContain('UnknownMint1234567890');
        expect(result.warning).toContain('PERMANENTLY LOST');
        expect(result.warning).toContain('Known stablecoin mints');
        expect(result.warning).toContain('USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      });

      it('should include dangerouslyAllowUnknownMint acknowledgment in warning', () => {
        const result = validateTokenMint('CustomToken', 'test', true);
        expect(result.warning).toContain('You have set dangerouslyAllowUnknownMint=true');
        expect(result.warning).toContain('Double-check your token mint address before deploying to production');
      });

      it('should warn but allow USDC with typo when allowUnknown=true', () => {
        const result = validateTokenMint('XPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'test', true);
        expect(result.isValid).toBe(true); // PERMISSIVE: Valid but warns
        expect(result.isKnownStablecoin).toBe(false);
        expect(result.warning).toBeDefined();
        expect(result.warning).toContain('XPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      });
    });

    describe('empty/undefined mints', () => {
      it('should validate undefined mint without warning', () => {
        const result = validateTokenMint(undefined);
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(false);
        expect(result.warning).toBeUndefined();
      });

      it('should validate empty string without warning', () => {
        const result = validateTokenMint('');
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(false);
        expect(result.warning).toBeUndefined();
      });

      it('should validate whitespace-only string without warning', () => {
        const result = validateTokenMint('   ');
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(false);
        expect(result.warning).toBeUndefined();
      });
    });

    describe('whitespace handling', () => {
      it('should trim leading whitespace and validate', () => {
        const result = validateTokenMint('  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(true);
        expect(result.symbol).toBe('USDC');
        expect(result.warning).toBeUndefined();
      });

      it('should trim trailing whitespace and validate', () => {
        const result = validateTokenMint('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  ');
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(true);
        expect(result.symbol).toBe('USDC');
        expect(result.warning).toBeUndefined();
      });
    });
  });

  describe('validateX402Asset', () => {
    describe('STRICT MODE (default)', () => {
      it('should validate known stablecoin asset', () => {
        const result = validateX402Asset('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'demo-item');
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(true);
        expect(result.symbol).toBe('USDC');
        expect(result.warning).toBeUndefined();
        expect(result.error).toBeUndefined();
      });

      it('should fail for unknown asset with resource context', () => {
        const result = validateX402Asset('UnknownAsset', 'premium-content');
        expect(result.isValid).toBe(false);
        expect(result.isKnownStablecoin).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('X402Requirement (resource: premium-content)');
        expect(result.error).toContain('UnknownAsset');
      });

      it('should use default resource if not provided', () => {
        const result = validateX402Asset('UnknownAsset');
        expect(result.error).toContain('X402Requirement (resource: unknown)');
      });

      it('should validate undefined asset without warning', () => {
        const result = validateX402Asset(undefined, 'demo-item');
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(false);
        expect(result.warning).toBeUndefined();
        expect(result.error).toBeUndefined();
      });
    });

    describe('PERMISSIVE MODE (allowUnknown=true)', () => {
      it('should warn for unknown asset when allowUnknown=true', () => {
        const result = validateX402Asset('UnknownAsset', 'premium-content', true);
        expect(result.isValid).toBe(true);
        expect(result.isKnownStablecoin).toBe(false);
        expect(result.warning).toBeDefined();
        expect(result.warning).toContain('X402Requirement (resource: premium-content)');
        expect(result.warning).toContain('UnknownAsset');
      });
    });
  });

  describe('error message content (STRICT MODE)', () => {
    it('should include all known stablecoins in error', () => {
      const result = validateTokenMint('UnknownToken');
      expect(result.error).toContain('CASH: CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH');
      expect(result.error).toContain('USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      expect(result.error).toContain('USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
      expect(result.error).toContain('PYUSD: 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo');
    });

    it('should explain permanent loss risk', () => {
      const result = validateTokenMint('UnknownToken');
      expect(result.error).toContain('PERMANENT LOSS OF FUNDS');
    });

    it('should provide opt-in instructions', () => {
      const result = validateTokenMint('UnknownToken');
      expect(result.error).toContain('dangerouslyAllowUnknownMint={true}');
      expect(result.error).toContain('custom token, testnet, or new stablecoin');
    });
  });

  describe('warning message content (PERMISSIVE MODE)', () => {
    it('should include all known stablecoins in warning', () => {
      const result = validateTokenMint('UnknownToken', undefined, true);
      expect(result.warning).toContain('CASH: CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH');
      expect(result.warning).toContain('USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      expect(result.warning).toContain('USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
      expect(result.warning).toContain('PYUSD: 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo');
    });

    it('should mention production deployment risk', () => {
      const result = validateTokenMint('UnknownToken', undefined, true);
      expect(result.warning).toContain('Double-check your token mint address before deploying to production');
    });

    it('should explain permanent loss risk', () => {
      const result = validateTokenMint('UnknownToken', undefined, true);
      expect(result.warning).toContain('PERMANENTLY LOST');
    });

    it('should acknowledge intentional use cases', () => {
      const result = validateTokenMint('UnknownToken', undefined, true);
      expect(result.warning).toContain('You have set dangerouslyAllowUnknownMint=true, so this will proceed');
      expect(result.warning).toContain('Double-check your token mint address before deploying to production');
    });
  });
});
