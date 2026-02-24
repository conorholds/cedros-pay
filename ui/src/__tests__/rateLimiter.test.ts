import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRateLimiter, RATE_LIMITER_PRESETS } from '../utils/rateLimiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createRateLimiter', () => {
    it('should allow requests up to the limit', () => {
      const limiter = createRateLimiter({ maxRequests: 3, windowMs: 1000 });

      expect(limiter.tryConsume()).toBe(true);
      expect(limiter.tryConsume()).toBe(true);
      expect(limiter.tryConsume()).toBe(true);
      expect(limiter.tryConsume()).toBe(false); // Fourth request should be blocked
    });

    it('should refill tokens over time', () => {
      const limiter = createRateLimiter({ maxRequests: 10, windowMs: 1000 });

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        limiter.tryConsume();
      }

      // Should be rate limited
      expect(limiter.tryConsume()).toBe(false);

      // Advance time by half the window (should refill 5 tokens)
      vi.advanceTimersByTime(500);

      // Should be able to make 5 more requests
      expect(limiter.tryConsume()).toBe(true);
      expect(limiter.tryConsume()).toBe(true);
      expect(limiter.tryConsume()).toBe(true);
      expect(limiter.tryConsume()).toBe(true);
      expect(limiter.tryConsume()).toBe(true);
      expect(limiter.tryConsume()).toBe(false); // Sixth should fail
    });

    it('should not exceed maxRequests even after long idle period', () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });

      // Wait a very long time
      vi.advanceTimersByTime(10000);

      // Should still only have maxRequests tokens available
      expect(limiter.getAvailableTokens()).toBe(5);

      // Should be able to make exactly maxRequests requests
      for (let i = 0; i < 5; i++) {
        expect(limiter.tryConsume()).toBe(true);
      }
      expect(limiter.tryConsume()).toBe(false);
    });

    it('should calculate available tokens correctly', () => {
      const limiter = createRateLimiter({ maxRequests: 10, windowMs: 1000 });

      expect(limiter.getAvailableTokens()).toBe(10);

      limiter.tryConsume();
      limiter.tryConsume();
      limiter.tryConsume();

      expect(limiter.getAvailableTokens()).toBe(7);
    });

    it('should calculate time until refill correctly', () => {
      const limiter = createRateLimiter({ maxRequests: 10, windowMs: 1000 });

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        limiter.tryConsume();
      }

      // Time until refill should be approximately 100ms (1000ms / 10 tokens = 100ms per token)
      const timeUntilRefill = limiter.getTimeUntilRefill();
      expect(timeUntilRefill).toBeGreaterThan(90);
      expect(timeUntilRefill).toBeLessThan(110);
    });

    it('should report zero time until refill when tokens are available', () => {
      const limiter = createRateLimiter({ maxRequests: 10, windowMs: 1000 });

      expect(limiter.getTimeUntilRefill()).toBe(0);

      // Consume some but not all tokens
      limiter.tryConsume();
      limiter.tryConsume();

      expect(limiter.getTimeUntilRefill()).toBe(0);
    });

    it('should reset to initial state', () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });

      // Consume all tokens
      for (let i = 0; i < 5; i++) {
        limiter.tryConsume();
      }

      expect(limiter.tryConsume()).toBe(false);

      // Reset
      limiter.reset();

      // Should have all tokens available again
      expect(limiter.getAvailableTokens()).toBe(5);
      expect(limiter.tryConsume()).toBe(true);
    });

    it('should handle fractional token refills correctly', () => {
      // 10 requests per second = 0.01 tokens per millisecond
      const limiter = createRateLimiter({ maxRequests: 10, windowMs: 1000 });

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        limiter.tryConsume();
      }

      // Advance by 50ms (should add 0.5 tokens - not enough for a request)
      vi.advanceTimersByTime(50);
      expect(limiter.tryConsume()).toBe(false);

      // Advance by another 50ms (total 100ms = 1 full token)
      vi.advanceTimersByTime(50);
      expect(limiter.tryConsume()).toBe(true);
      expect(limiter.tryConsume()).toBe(false);
    });

    it('should work with different window sizes', () => {
      // 60 requests per minute
      const limiter = createRateLimiter({ maxRequests: 60, windowMs: 60000 });

      // Should allow initial burst
      for (let i = 0; i < 60; i++) {
        expect(limiter.tryConsume()).toBe(true);
      }

      expect(limiter.tryConsume()).toBe(false);

      // Wait 1 second (should refill 1 token)
      vi.advanceTimersByTime(1000);

      expect(limiter.tryConsume()).toBe(true);
      expect(limiter.tryConsume()).toBe(false);
    });
  });

  describe('RATE_LIMITER_PRESETS', () => {
    it('should have valid payment preset', () => {
      const limiter = createRateLimiter(RATE_LIMITER_PRESETS.PAYMENT);

      // Should allow 10 requests
      for (let i = 0; i < 10; i++) {
        expect(limiter.tryConsume()).toBe(true);
      }

      expect(limiter.tryConsume()).toBe(false);
    });

    it('should have valid quote preset', () => {
      const limiter = createRateLimiter(RATE_LIMITER_PRESETS.QUOTE);

      // Should allow 30 requests
      for (let i = 0; i < 30; i++) {
        expect(limiter.tryConsume()).toBe(true);
      }

      expect(limiter.tryConsume()).toBe(false);
    });

    it('should have valid strict preset', () => {
      const limiter = createRateLimiter(RATE_LIMITER_PRESETS.STRICT);

      // Should allow 5 requests
      for (let i = 0; i < 5; i++) {
        expect(limiter.tryConsume()).toBe(true);
      }

      expect(limiter.tryConsume()).toBe(false);
    });

    it('should have valid permissive preset', () => {
      const limiter = createRateLimiter(RATE_LIMITER_PRESETS.PERMISSIVE);

      // Should allow 100 requests
      for (let i = 0; i < 100; i++) {
        expect(limiter.tryConsume()).toBe(true);
      }

      expect(limiter.tryConsume()).toBe(false);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle rapid consecutive requests', () => {
      const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });

      // Simulate rapid clicking
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(limiter.tryConsume());
      }

      // First 5 should succeed, rest should fail
      expect(results).toEqual([
        true,
        true,
        true,
        true,
        true,
        false,
        false,
        false,
        false,
        false,
      ]);
    });

    it('should handle steady request rate below limit', () => {
      // 10 per second
      const limiter = createRateLimiter({ maxRequests: 10, windowMs: 1000 });

      // Make 1 request every 200ms (5 per second) for 2 seconds
      for (let i = 0; i < 10; i++) {
        expect(limiter.tryConsume()).toBe(true);
        vi.advanceTimersByTime(200);
      }

      // Should still have tokens available
      expect(limiter.getAvailableTokens()).toBeGreaterThan(0);
    });

    it('should prevent DoS from malicious users', () => {
      const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60000 });

      // Attacker tries to make 100 requests
      let successCount = 0;
      for (let i = 0; i < 100; i++) {
        if (limiter.tryConsume()) {
          successCount++;
        }
      }

      // Should only allow 10 requests
      expect(successCount).toBe(10);
    });
  });
});
