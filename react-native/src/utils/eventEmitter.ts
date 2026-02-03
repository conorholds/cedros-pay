/**
 * Payment Lifecycle Event Emitter
 *
 * Provides browser-native CustomEvent emission for payment lifecycle tracking.
 * Enables integration with analytics platforms (Google Analytics, Mixpanel, etc.)
 * outside the React component tree.
 *
 * Events:
 * - cedros:payment:start - Payment attempt initiated (button clicked)
 * - cedros:wallet:connect - Wallet connection initiated
 * - cedros:wallet:connected - Wallet successfully connected
 * - cedros:wallet:error - Wallet connection failed
 * - cedros:payment:processing - Payment transaction in progress
 * - cedros:payment:success - Payment completed successfully
 * - cedros:payment:error - Payment failed
 */

/**
 * Payment method type
 */
export type PaymentMethod = 'stripe' | 'crypto' | 'credits';

/**
 * Wallet provider type
 */
export type WalletProvider = 'phantom' | 'solflare' | 'backpack' | string;

/**
 * Base event detail interface
 */
interface BaseEventDetail {
  timestamp: number;
  method: PaymentMethod;
}

/**
 * Payment start event detail
 */
export interface PaymentStartDetail extends BaseEventDetail {
  resource?: string;
  itemCount?: number;
}

/**
 * Wallet connect event detail
 */
export interface WalletConnectDetail {
  timestamp: number;
  wallet: WalletProvider;
  publicKey?: string;
}

/**
 * Wallet error event detail
 */
export interface WalletErrorDetail {
  timestamp: number;
  wallet?: WalletProvider;
  error: string;
}

/**
 * Payment processing event detail
 */
export interface PaymentProcessingDetail extends BaseEventDetail {
  resource?: string;
  itemCount?: number;
}

/**
 * Payment success event detail
 */
export interface PaymentSuccessDetail extends BaseEventDetail {
  transactionId: string;
  resource?: string;
  itemCount?: number;
}

/**
 * Payment error event detail
 */
export interface PaymentErrorDetail extends BaseEventDetail {
  error: string;
  resource?: string;
  itemCount?: number;
}

/**
 * Event name constants
 */
export const CEDROS_EVENTS = {
  PAYMENT_START: 'cedros:payment:start',
  WALLET_CONNECT: 'cedros:wallet:connect',
  WALLET_CONNECTED: 'cedros:wallet:connected',
  WALLET_ERROR: 'cedros:wallet:error',
  PAYMENT_PROCESSING: 'cedros:payment:processing',
  PAYMENT_SUCCESS: 'cedros:payment:success',
  PAYMENT_ERROR: 'cedros:payment:error',
} as const;

/**
 * Event emitter for React Native
 *
 * Uses a simple callback-based approach since React Native doesn't have
 * a DOM or CustomEvent. Consumers can subscribe to events via callbacks.
 */

// Store event listeners
const eventListeners: Map<string, Set<(detail: unknown) => void>> = new Map();

/**
 * Subscribe to an event
 * @param eventName - The event name to listen for
 * @param callback - Function to call when event is emitted
 * @returns Unsubscribe function
 */
export function subscribeToEvent<T>(
  eventName: string,
  callback: (detail: T) => void
): () => void {
  if (!eventListeners.has(eventName)) {
    eventListeners.set(eventName, new Set());
  }

  const listeners = eventListeners.get(eventName)!;
  listeners.add(callback as (detail: unknown) => void);

  // Return unsubscribe function
  return () => {
    listeners.delete(callback as (detail: unknown) => void);
  };
}

/**
 * Emit an event
 * @param eventName - The event name
 * @param detail - The event detail payload
 */
function emitEvent<T>(eventName: string, detail: T): void {
  const listeners = eventListeners.get(eventName);
  if (listeners) {
    listeners.forEach((callback) => {
      try {
        callback(detail);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }
}

/**
 * Emit payment start event
 */
export function emitPaymentStart(
  method: PaymentMethod,
  resource?: string,
  itemCount?: number
): void {
  emitEvent<PaymentStartDetail>(CEDROS_EVENTS.PAYMENT_START, {
    timestamp: Date.now(),
    method,
    resource,
    itemCount,
  });
}

/**
 * Emit wallet connect event (connection initiated)
 */
export function emitWalletConnect(wallet: WalletProvider): void {
  emitEvent<WalletConnectDetail>(CEDROS_EVENTS.WALLET_CONNECT, {
    timestamp: Date.now(),
    wallet,
  });
}

/**
 * Emit wallet connected event (connection successful)
 */
export function emitWalletConnected(
  wallet: WalletProvider,
  publicKey: string
): void {
  emitEvent<WalletConnectDetail>(CEDROS_EVENTS.WALLET_CONNECTED, {
    timestamp: Date.now(),
    wallet,
    publicKey,
  });
}

/**
 * Emit wallet error event
 */
export function emitWalletError(error: string, wallet?: WalletProvider): void {
  emitEvent<WalletErrorDetail>(CEDROS_EVENTS.WALLET_ERROR, {
    timestamp: Date.now(),
    wallet,
    error,
  });
}

/**
 * Emit payment processing event
 */
export function emitPaymentProcessing(
  method: PaymentMethod,
  resource?: string,
  itemCount?: number
): void {
  emitEvent<PaymentProcessingDetail>(CEDROS_EVENTS.PAYMENT_PROCESSING, {
    timestamp: Date.now(),
    method,
    resource,
    itemCount,
  });
}

/**
 * Emit payment success event
 */
export function emitPaymentSuccess(
  method: PaymentMethod,
  transactionId: string,
  resource?: string,
  itemCount?: number
): void {
  emitEvent<PaymentSuccessDetail>(CEDROS_EVENTS.PAYMENT_SUCCESS, {
    timestamp: Date.now(),
    method,
    transactionId,
    resource,
    itemCount,
  });
}

/**
 * Emit payment error event
 */
export function emitPaymentError(
  method: PaymentMethod,
  error: string,
  resource?: string,
  itemCount?: number
): void {
  emitEvent<PaymentErrorDetail>(CEDROS_EVENTS.PAYMENT_ERROR, {
    timestamp: Date.now(),
    method,
    error,
    resource,
    itemCount,
  });
}
