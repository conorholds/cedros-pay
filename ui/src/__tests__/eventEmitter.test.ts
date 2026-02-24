import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import {
  CEDROS_EVENTS,
  emitPaymentStart,
  emitWalletConnect,
  emitWalletConnected,
  emitWalletError,
  emitPaymentProcessing,
  emitPaymentSuccess,
  emitPaymentError,
  type PaymentStartDetail,
  type WalletConnectDetail,
  type WalletErrorDetail,
  type PaymentProcessingDetail,
  type PaymentSuccessDetail,
  type PaymentErrorDetail,
} from '../utils/eventEmitter';

describe('Event Emitter', () => {
  let eventListener: Mock;

  beforeEach(() => {
    eventListener = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CEDROS_EVENTS constants', () => {
    it('defines all event names correctly', () => {
      expect(CEDROS_EVENTS.PAYMENT_START).toBe('cedros:payment:start');
      expect(CEDROS_EVENTS.WALLET_CONNECT).toBe('cedros:wallet:connect');
      expect(CEDROS_EVENTS.WALLET_CONNECTED).toBe('cedros:wallet:connected');
      expect(CEDROS_EVENTS.WALLET_ERROR).toBe('cedros:wallet:error');
      expect(CEDROS_EVENTS.PAYMENT_PROCESSING).toBe('cedros:payment:processing');
      expect(CEDROS_EVENTS.PAYMENT_SUCCESS).toBe('cedros:payment:success');
      expect(CEDROS_EVENTS.PAYMENT_ERROR).toBe('cedros:payment:error');
    });
  });

  describe('emitPaymentStart', () => {
    it('emits payment start event with stripe method', () => {
      window.addEventListener(CEDROS_EVENTS.PAYMENT_START, eventListener);

      emitPaymentStart('stripe', 'demo-item', undefined);

      expect(eventListener).toHaveBeenCalledOnce();
      const event = eventListener.mock.calls[0][0] as CustomEvent<PaymentStartDetail>;
      expect(event.detail.method).toBe('stripe');
      expect(event.detail.resource).toBe('demo-item');
      expect(event.detail.timestamp).toBeGreaterThan(0);

      window.removeEventListener(CEDROS_EVENTS.PAYMENT_START, eventListener);
    });

    it('emits payment start event with crypto method and item count', () => {
      window.addEventListener(CEDROS_EVENTS.PAYMENT_START, eventListener);

      emitPaymentStart('crypto', undefined, 3);

      expect(eventListener).toHaveBeenCalledOnce();
      const event = eventListener.mock.calls[0][0] as CustomEvent<PaymentStartDetail>;
      expect(event.detail.method).toBe('crypto');
      expect(event.detail.itemCount).toBe(3);

      window.removeEventListener(CEDROS_EVENTS.PAYMENT_START, eventListener);
    });
  });

  describe('emitWalletConnect', () => {
    it('emits wallet connect event', () => {
      window.addEventListener(CEDROS_EVENTS.WALLET_CONNECT, eventListener);

      emitWalletConnect('phantom');

      expect(eventListener).toHaveBeenCalledOnce();
      const event = eventListener.mock.calls[0][0] as CustomEvent<WalletConnectDetail>;
      expect(event.detail.wallet).toBe('phantom');
      expect(event.detail.timestamp).toBeGreaterThan(0);

      window.removeEventListener(CEDROS_EVENTS.WALLET_CONNECT, eventListener);
    });
  });

  describe('emitWalletConnected', () => {
    it('emits wallet connected event with public key', () => {
      window.addEventListener(CEDROS_EVENTS.WALLET_CONNECTED, eventListener);

      const pubkey = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
      emitWalletConnected('solflare', pubkey);

      expect(eventListener).toHaveBeenCalledOnce();
      const event = eventListener.mock.calls[0][0] as CustomEvent<WalletConnectDetail>;
      expect(event.detail.wallet).toBe('solflare');
      expect(event.detail.publicKey).toBe(pubkey);
      expect(event.detail.timestamp).toBeGreaterThan(0);

      window.removeEventListener(CEDROS_EVENTS.WALLET_CONNECTED, eventListener);
    });
  });

  describe('emitWalletError', () => {
    it('emits wallet error event with error message', () => {
      window.addEventListener(CEDROS_EVENTS.WALLET_ERROR, eventListener);

      emitWalletError('User rejected connection', 'phantom');

      expect(eventListener).toHaveBeenCalledOnce();
      const event = eventListener.mock.calls[0][0] as CustomEvent<WalletErrorDetail>;
      expect(event.detail.error).toBe('User rejected connection');
      expect(event.detail.wallet).toBe('phantom');
      expect(event.detail.timestamp).toBeGreaterThan(0);

      window.removeEventListener(CEDROS_EVENTS.WALLET_ERROR, eventListener);
    });

    it('emits wallet error without wallet name', () => {
      window.addEventListener(CEDROS_EVENTS.WALLET_ERROR, eventListener);

      emitWalletError('No wallets available');

      expect(eventListener).toHaveBeenCalledOnce();
      const event = eventListener.mock.calls[0][0] as CustomEvent<WalletErrorDetail>;
      expect(event.detail.error).toBe('No wallets available');
      expect(event.detail.wallet).toBeUndefined();

      window.removeEventListener(CEDROS_EVENTS.WALLET_ERROR, eventListener);
    });
  });

  describe('emitPaymentProcessing', () => {
    it('emits payment processing event', () => {
      window.addEventListener(CEDROS_EVENTS.PAYMENT_PROCESSING, eventListener);

      emitPaymentProcessing('stripe', 'demo-item', undefined);

      expect(eventListener).toHaveBeenCalledOnce();
      const event = eventListener.mock.calls[0][0] as CustomEvent<PaymentProcessingDetail>;
      expect(event.detail.method).toBe('stripe');
      expect(event.detail.resource).toBe('demo-item');
      expect(event.detail.timestamp).toBeGreaterThan(0);

      window.removeEventListener(CEDROS_EVENTS.PAYMENT_PROCESSING, eventListener);
    });
  });

  describe('emitPaymentSuccess', () => {
    it('emits payment success event with transaction ID', () => {
      window.addEventListener(CEDROS_EVENTS.PAYMENT_SUCCESS, eventListener);

      emitPaymentSuccess('crypto', 'tx_abc123', 'demo-item', undefined);

      expect(eventListener).toHaveBeenCalledOnce();
      const event = eventListener.mock.calls[0][0] as CustomEvent<PaymentSuccessDetail>;
      expect(event.detail.method).toBe('crypto');
      expect(event.detail.transactionId).toBe('tx_abc123');
      expect(event.detail.resource).toBe('demo-item');
      expect(event.detail.timestamp).toBeGreaterThan(0);

      window.removeEventListener(CEDROS_EVENTS.PAYMENT_SUCCESS, eventListener);
    });

    it('emits payment success for cart with item count', () => {
      window.addEventListener(CEDROS_EVENTS.PAYMENT_SUCCESS, eventListener);

      emitPaymentSuccess('stripe', 'cs_test_123', undefined, 5);

      expect(eventListener).toHaveBeenCalledOnce();
      const event = eventListener.mock.calls[0][0] as CustomEvent<PaymentSuccessDetail>;
      expect(event.detail.method).toBe('stripe');
      expect(event.detail.transactionId).toBe('cs_test_123');
      expect(event.detail.itemCount).toBe(5);

      window.removeEventListener(CEDROS_EVENTS.PAYMENT_SUCCESS, eventListener);
    });
  });

  describe('emitPaymentError', () => {
    it('emits payment error event', () => {
      window.addEventListener(CEDROS_EVENTS.PAYMENT_ERROR, eventListener);

      emitPaymentError('stripe', 'Insufficient funds', 'demo-item', undefined);

      expect(eventListener).toHaveBeenCalledOnce();
      const event = eventListener.mock.calls[0][0] as CustomEvent<PaymentErrorDetail>;
      expect(event.detail.method).toBe('stripe');
      expect(event.detail.error).toBe('Insufficient funds');
      expect(event.detail.resource).toBe('demo-item');
      expect(event.detail.timestamp).toBeGreaterThan(0);

      window.removeEventListener(CEDROS_EVENTS.PAYMENT_ERROR, eventListener);
    });
  });

  describe('event bubbling', () => {
    it('events bubble up to window', () => {
      window.addEventListener(CEDROS_EVENTS.PAYMENT_START, eventListener);

      emitPaymentStart('stripe', 'demo-item', undefined);

      expect(eventListener).toHaveBeenCalledOnce();
      const event = eventListener.mock.calls[0][0] as CustomEvent;
      expect(event.bubbles).toBe(true);

      window.removeEventListener(CEDROS_EVENTS.PAYMENT_START, eventListener);
    });

    it('events are not cancelable', () => {
      window.addEventListener(CEDROS_EVENTS.PAYMENT_START, eventListener);

      emitPaymentStart('crypto', 'demo-item', undefined);

      const event = eventListener.mock.calls[0][0] as CustomEvent;
      expect(event.cancelable).toBe(false);

      window.removeEventListener(CEDROS_EVENTS.PAYMENT_START, eventListener);
    });
  });

  describe('multiple listeners', () => {
    it('notifies all registered listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      window.addEventListener(CEDROS_EVENTS.PAYMENT_START, listener1);
      window.addEventListener(CEDROS_EVENTS.PAYMENT_START, listener2);

      emitPaymentStart('stripe', 'demo-item', undefined);

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();

      window.removeEventListener(CEDROS_EVENTS.PAYMENT_START, listener1);
      window.removeEventListener(CEDROS_EVENTS.PAYMENT_START, listener2);
    });
  });

  describe('timestamp accuracy', () => {
    it('uses current timestamp for each event', () => {
      window.addEventListener(CEDROS_EVENTS.PAYMENT_START, eventListener);

      const beforeEmit = Date.now();
      emitPaymentStart('stripe', 'demo-item', undefined);
      const afterEmit = Date.now();

      const event = eventListener.mock.calls[0][0] as CustomEvent<PaymentStartDetail>;
      expect(event.detail.timestamp).toBeGreaterThanOrEqual(beforeEmit);
      expect(event.detail.timestamp).toBeLessThanOrEqual(afterEmit);

      window.removeEventListener(CEDROS_EVENTS.PAYMENT_START, eventListener);
    });
  });
});
