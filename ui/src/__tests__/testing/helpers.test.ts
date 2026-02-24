import { describe, it, expect } from 'vitest';
import {
  mockPaymentSuccess,
  mockPaymentFailure,
  mockX402Quote,
  mockSettlement,
  mockQuoteResponse,
  mockVerifyResponse,
  mockStripeSessionResponse,
  mockWalletConnect,
  mockSignTransaction,
  createSpy,
  waitForNextTick,
  wait,
} from '../../testing/helpers';

describe('Testing Helpers', () => {
  describe('mockPaymentSuccess', () => {
    it('should create a successful payment result', () => {
      const result = mockPaymentSuccess('cs_test_123');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('cs_test_123');
      expect(result.error).toBeUndefined();
    });

    it('should use default session ID if not provided', () => {
      const result = mockPaymentSuccess();

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('cs_test_mock123');
    });
  });

  describe('mockPaymentFailure', () => {
    it('should create a failed payment result', () => {
      const result = mockPaymentFailure('Card declined');

      expect(result.success).toBe(false);
      expect(result.transactionId).toBeUndefined();
      expect(result.error).toBe('Card declined');
    });

    it('should use default error message if not provided', () => {
      const result = mockPaymentFailure();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment failed');
    });
  });

  describe('mockX402Quote', () => {
    it('should create a mock x402 quote with default values', () => {
      const quote = mockX402Quote();

      expect(quote.scheme).toBe('solana-spl-transfer');
      expect(quote.network).toBe('mainnet-beta');
      expect(quote.maxAmountRequired).toBe('1000000');
      expect(quote.payTo).toBe('mockRecipient123');
      expect(quote.resource).toBe('test-resource');
      expect(quote.asset).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      expect(quote.extra?.tokenSymbol).toBe('USDC');
      expect(quote.extra?.memo).toBe('test-payment');
    });

    it('should create a mock x402 quote with custom values', () => {
      const quote = mockX402Quote({
        payTo: 'customRecipient',
        maxAmountRequired: '2000000',
        asset: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT mint
        extra: {
          tokenSymbol: 'USDT',
          memo: 'custom-payment',
          decimals: 6,
        },
      });

      expect(quote.payTo).toBe('customRecipient');
      expect(quote.maxAmountRequired).toBe('2000000');
      expect(quote.asset).toBe('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
      expect(quote.extra?.tokenSymbol).toBe('USDT');
      expect(quote.extra?.memo).toBe('custom-payment');
    });

    it('should have timeout seconds defined', () => {
      const quote = mockX402Quote();
      expect(quote.maxTimeoutSeconds).toBe(300);
    });
  });

  describe('mockSettlement', () => {
    it('should create a mock settlement with default values', () => {
      const settlement = mockSettlement();

      expect(settlement.success).toBe(true);
      expect(settlement.error).toBeNull();
      expect(settlement.txHash).toBe('mockSignature123');
      expect(settlement.networkId).toBe('mainnet-beta');
    });

    it('should create a mock settlement with custom values', () => {
      const settlement = mockSettlement({
        success: false,
        error: 'Payment failed',
        txHash: null,
        networkId: null,
      });

      expect(settlement.success).toBe(false);
      expect(settlement.error).toBe('Payment failed');
      expect(settlement.txHash).toBeNull();
      expect(settlement.networkId).toBeNull();
    });
  });

  describe('mockQuoteResponse', () => {
    it('should create a 402 response with x402 spec', async () => {
      const response = mockQuoteResponse('test-resource');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(402);

      const data = await response.json();
      expect(data.x402Version).toBe(0);
      expect(data.error).toBe('payment required');
      expect(data.accepts).toHaveLength(1);
      expect(data.accepts[0].payTo).toBe('mockRecipient123');
      expect(data.accepts[0].maxAmountRequired).toBe('1000000');
      expect(data.accepts[0].asset).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    });

    it('should create a response with custom values', async () => {
      const response = mockQuoteResponse('premium-article', {
        maxAmountRequired: '5000000',
        asset: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        payTo: 'customRecipient',
      });

      const data = await response.json();
      expect(data.accepts[0].maxAmountRequired).toBe('5000000');
      expect(data.accepts[0].asset).toBe('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
      expect(data.accepts[0].payTo).toBe('customRecipient');
    });
  });

  describe('mockVerifyResponse', () => {
    it('should create a successful verification response', async () => {
      const response = mockVerifyResponse(true);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.txHash).toBe('mockSignature123');
      expect(data.error).toBeNull();
      expect(response.headers.get('x-payment-response')).toBeDefined();
    });

    it('should create a failed verification response', async () => {
      const response = mockVerifyResponse(false);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(402);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Payment verification failed');
      expect(data.txHash).toBeNull();
    });
  });

  describe('mockStripeSessionResponse', () => {
    it('should create a Stripe session response', async () => {
      const response = mockStripeSessionResponse('cs_test_123');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.sessionId).toBe('cs_test_123');
      expect(data.url).toContain('cs_test_123');
    });
  });

  describe('mockWalletConnect', () => {
    it('should create a mock wallet connection', () => {
      const wallet = mockWalletConnect('testWallet123');

      expect(wallet.publicKey.toBase58()).toBe('testWallet123');
      expect(wallet.publicKey.toString()).toBe('testWallet123');
    });
  });

  describe('mockSignTransaction', () => {
    it('should create a mock signed transaction', () => {
      const signed = mockSignTransaction();

      expect(signed.signature).toBeInstanceOf(Uint8Array);
      expect(signed.signature.length).toBe(64);
      expect(signed.serialize()).toBeInstanceOf(Uint8Array);
    });
  });

  describe('createSpy', () => {
    it('should create a spy function', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spy = createSpy() as any;

      spy('test');
      expect(spy).toHaveBeenCalledWith('test');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should create a spy with implementation', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const spy = createSpy((x: number) => x * 2) as any;

      const result = spy(5);
      expect(result).toBe(10);
      expect(spy).toHaveBeenCalledWith(5);
    });
  });

  describe('async helpers', () => {
    it('waitForNextTick should wait for next tick', async () => {
      let executed = false;

      setTimeout(() => {
        executed = true;
      }, 0);

      await waitForNextTick();

      expect(executed).toBe(true);
    });

    it('wait should wait for specified time', async () => {
      const start = Date.now();

      await wait(100);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });
});
