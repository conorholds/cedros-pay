import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  configureTelemetry,
  generateCorrelationId,
  sanitizePII,
  sanitizeError,
  enrichError,
  reportError,
  createErrorReporter,
  resetTelemetry,
  ErrorSeverity,
  type EnrichedError,
} from '../utils/telemetry';

describe('Telemetry System', () => {
  beforeEach(() => {
    resetTelemetry();
    vi.clearAllMocks();
  });

  describe('generateCorrelationId', () => {
    it('should generate correlation ID with correct format', () => {
      const id = generateCorrelationId();

      expect(id).toMatch(/^cedros_\d+_[a-z0-9-]{12}$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('sanitizePII', () => {
    beforeEach(() => {
      // Enable telemetry for these tests so sanitizePII works
      configureTelemetry({ enabled: true, sanitizePII: true });
    });

    it('should redact email addresses', () => {
      const input = 'Error: user@example.com failed to authenticate';
      const output = sanitizePII(input);

      expect(output).toBe('Error: [REDACTED] failed to authenticate');
      expect(output).not.toContain('user@example.com');
    });

    it('should redact phone numbers', () => {
      const input = 'Contact: 555-123-4567';
      const output = sanitizePII(input);

      expect(output).toBe('Contact: [REDACTED]');
    });

    it('should redact credit card numbers', () => {
      const input = 'Card: 4532-1234-5678-9010';
      const output = sanitizePII(input);

      expect(output).toBe('Card: [REDACTED]');
    });

    it('should NOT redact Solana wallet addresses or program IDs (32-44 char Base58)', () => {
      // Public keys and program IDs are not sensitive; redacting them obscures
      // useful debugging context (e.g. TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA).
      const input = 'Wallet: 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9jzUGjxD failed';
      const output = sanitizePII(input);

      expect(output).toBe('Wallet: 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9jzUGjxD failed');
    });

    it('should redact Solana private keys', () => {
      // 88-character Base58 private key
      const privateKey = '5JKt9dCPXDpvBXVJLGxXoN3qQ8hH2RpQvZ9KuWmE3xFvUqGzJ4tRnMwP6LkYsXaB1HcDfW2NvE4TmGrS8KpV3oU9';
      const input = `Private key: ${privateKey}`;
      const output = sanitizePII(input);

      expect(output).toBe('Private key: [REDACTED]');
      expect(output).not.toContain(privateKey);
    });

    it('should redact Ethereum addresses', () => {
      const input = 'Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
      const output = sanitizePII(input);

      expect(output).toBe('Address: [REDACTED]');
    });

    it('should redact API keys', () => {
      const input = 'Key: sk_test_51H9XYZ123456789ABCDEFGHIJKLMNO';
      const output = sanitizePII(input);

      expect(output).toBe('Key: [REDACTED]');
    });

    it('should redact JWT tokens', () => {
      const input = 'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
      const output = sanitizePII(input);

      expect(output).toBe('Token: [REDACTED]');
    });

    it('should redact hex strings (potential keys)', () => {
      const input = 'Key: abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const output = sanitizePII(input);

      expect(output).toBe('Key: [REDACTED]');
    });

    it('should handle multiple PII patterns', () => {
      // Wallet address (public key) is no longer redacted — it is not sensitive.
      const input = 'User user@test.com with wallet 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9jzUGjxD';
      const output = sanitizePII(input);

      expect(output).toBe('User [REDACTED] with wallet 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9jzUGjxD');
    });
  });

  describe('sanitizeError', () => {
    beforeEach(() => {
      // Enable telemetry for these tests so sanitizeError works
      configureTelemetry({ enabled: true, sanitizePII: true });
    });

    it('should sanitize error message', () => {
      const error = new Error('Payment from user@example.com failed');
      const sanitized = sanitizeError(error);

      expect(sanitized.message).toBe('Payment from [REDACTED] failed');
    });

    it('should sanitize error stack', () => {
      const error = new Error('Test error');
      error.stack = 'Error at user@example.com:123';

      const sanitized = sanitizeError(error);

      expect(sanitized.stack).toContain('[REDACTED]');
      expect(sanitized.stack).not.toContain('user@example.com');
    });

    it('should preserve error name', () => {
      const error = new Error('Test');
      error.name = 'ValidationError';

      const sanitized = sanitizeError(error);

      expect(sanitized.name).toBe('ValidationError');
    });
  });

  describe('enrichError', () => {
    it('should enrich error with correlation ID', () => {
      const error = new Error('Test error');
      const enriched = enrichError(error);

      expect(enriched.correlationId).toMatch(/^cedros_\d+_[a-z0-9-]{12}$/);
    });

    it('should enrich error with timestamp', () => {
      const error = new Error('Test error');
      const enriched = enrichError(error);

      expect(enriched.timestamp).toBeGreaterThan(0);
      expect(enriched.timestampISO).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should use provided correlation ID', () => {
      const customId = 'cedros_1234567890_abc123';
      const error = new Error('Test error');
      const enriched = enrichError(error, { correlationId: customId });

      expect(enriched.correlationId).toBe(customId);
    });

    it('should include error severity', () => {
      const error = new Error('Test error');
      const enriched = enrichError(error, { severity: ErrorSeverity.CRITICAL });

      expect(enriched.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should default to ERROR severity', () => {
      const error = new Error('Test error');
      const enriched = enrichError(error);

      expect(enriched.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should include error code', () => {
      const error = new Error('Test error');
      const enriched = enrichError(error, { code: 'payment_failed' });

      expect(enriched.code).toBe('payment_failed');
    });

    it('should include payment context', () => {
      const error = new Error('Test error');
      const paymentContext = {
        paymentMethod: 'crypto' as const,
        resourceId: 'item-123',
        amount: '1000000',
        currency: 'USDC',
        stage: 'verify' as const,
      };

      const enriched = enrichError(error, { paymentContext });

      expect(enriched.paymentContext).toEqual(paymentContext);
    });

    it('should include tags', () => {
      const error = new Error('Test error');
      const tags = { module: 'payment', component: 'StripeButton' };

      const enriched = enrichError(error, { tags });

      expect(enriched.tags).toEqual(tags);
    });

    it('should sanitize error by default', () => {
      configureTelemetry({ enabled: true, sanitizePII: true });

      const error = new Error('Error from user@example.com');
      const enriched = enrichError(error);

      expect(enriched.message).toBe('Error from [REDACTED]');
    });

    it('should handle string errors', () => {
      const enriched = enrichError('Simple error message');

      expect(enriched.message).toBe('Simple error message');
      expect(enriched.error).toBeInstanceOf(Error);
    });
  });

  describe('configureTelemetry', () => {
    it('should configure telemetry', () => {
      const onError = vi.fn();

      configureTelemetry({
        enabled: true,
        sdkVersion: '2.0.0',
        environment: 'test',
        onError,
      });

      const error = new Error('Test');
      reportError(error);

      expect(onError).toHaveBeenCalled();
    });

    it('should disable telemetry by default', () => {
      const onError = vi.fn();

      configureTelemetry({ onError });

      reportError(new Error('Test'));

      expect(onError).not.toHaveBeenCalled();
    });

    it('should respect enabled flag', () => {
      const onError = vi.fn();

      configureTelemetry({
        enabled: true,
        onError,
      });

      reportError(new Error('Test'));

      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should add global tags to all errors', () => {
      const onError = vi.fn();

      configureTelemetry({
        enabled: true,
        globalTags: { app: 'test-app', version: '1.0.0' },
        onError,
      });

      reportError(new Error('Test'));

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({
            app: 'test-app',
            version: '1.0.0',
          }),
        })
      );
    });
  });

  describe('reportError', () => {
    it('should not report if telemetry disabled', () => {
      const onError = vi.fn();

      configureTelemetry({
        enabled: false,
        onError,
      });

      reportError(new Error('Test'));

      expect(onError).not.toHaveBeenCalled();
    });

    it('should not report if no hook configured', () => {
      configureTelemetry({
        enabled: true,
        // No onError hook
      });

      // Should not throw
      expect(() => reportError(new Error('Test'))).not.toThrow();
    });

    it('should report enriched errors', () => {
      const onError = vi.fn();

      configureTelemetry({
        enabled: true,
        onError,
      });

      const error = new Error('Test error');
      reportError(error);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: expect.any(String),
          message: 'Test error',
          severity: ErrorSeverity.ERROR,
        })
      );
    });

    it('should accept already enriched errors', () => {
      const onError = vi.fn();

      configureTelemetry({
        enabled: true,
        onError,
      });

      const enriched = enrichError(new Error('Test'), {
        correlationId: 'custom_id',
        severity: ErrorSeverity.CRITICAL,
      });

      reportError(enriched);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'custom_id',
          severity: ErrorSeverity.CRITICAL,
        })
      );
    });

    it('should handle hook errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      configureTelemetry({
        enabled: true,
        onError: () => {
          throw new Error('Hook failed');
        },
      });

      // Should not throw
      expect(() => reportError(new Error('Test'))).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('createErrorReporter', () => {
    it('should create reporter with default tags', () => {
      const onError = vi.fn();

      configureTelemetry({
        enabled: true,
        onError,
      });

      const reportPaymentError = createErrorReporter({
        module: 'payment',
        component: 'StripeButton',
      });

      reportPaymentError(new Error('Test'));

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({
            module: 'payment',
            component: 'StripeButton',
          }),
        })
      );
    });

    it('should merge tags with options', () => {
      const onError = vi.fn();

      configureTelemetry({
        enabled: true,
        onError,
      });

      const reportPaymentError = createErrorReporter({
        module: 'payment',
      });

      reportPaymentError(new Error('Test'), {
        tags: { action: 'checkout' },
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({
            module: 'payment',
            action: 'checkout',
          }),
        })
      );
    });
  });

  describe('Security: No sensitive data leaks', () => {
    it('should NEVER include private keys in errors', () => {
      const onError = vi.fn();

      configureTelemetry({
        enabled: true,
        sanitizePII: true,
        onError,
      });

      const privateKey = '5JKt9dCPXDpvBXVJLGxXoN3qQ8hH2RpQvZ9KuWmE3xFvUqGzJ4tRnMwP6LkYsXaB1HcDfW2NvE4TmGrS8KpV3oU9';
      const error = new Error(`Private key leaked: ${privateKey}`);

      reportError(error);

      const call = onError.mock.calls[0][0] as EnrichedError;
      expect(call.message).not.toContain(privateKey);
      expect(call.message).toContain('[REDACTED]');
    });

    it('should NOT redact wallet addresses (public keys are not sensitive)', () => {
      // Wallet public keys and program IDs appear in error context and are not
      // sensitive — redacting them makes debugging harder without any security
      // benefit. Private keys (86-90 char Base58) are still redacted.
      const onError = vi.fn();

      configureTelemetry({
        enabled: true,
        sanitizePII: true,
        onError,
      });

      const wallet = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9jzUGjxD';
      const error = new Error(`Payment from ${wallet} failed`);

      reportError(error);

      const call = onError.mock.calls[0][0] as EnrichedError;
      expect(call.message).toContain(wallet);
      expect(call.message).not.toContain('[REDACTED]');
    });

    it('should NEVER include API keys in errors', () => {
      const onError = vi.fn();

      configureTelemetry({
        enabled: true,
        sanitizePII: true,
        onError,
      });

      const apiKey = 'sk_test_51H9XYZ123456789ABCDEFGHIJKLMNOP';
      const error = new Error(`API key: ${apiKey}`);

      reportError(error);

      const call = onError.mock.calls[0][0] as EnrichedError;
      expect(call.message).not.toContain(apiKey);
      expect(call.message).toContain('[REDACTED]');
    });
  });
});
