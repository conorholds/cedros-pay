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

import {
  CEDROS_PAY_EXTENSION_ID,
  CEDROS_PAY_PAYMENT_STARTED_EVENT_ID,
  CEDROS_PAY_WALLET_CONNECTED_EVENT_ID,
} from '../extension/constants';
import type { PaymentMethod } from '../types/componentOptions';

export type { PaymentMethod } from '../types/componentOptions';

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
 * Emit a custom event on the window object
 *
 * @param eventName - The event name
 * @param detail - The event detail payload
 */
function emitEvent<T>(eventName: string, detail: T): void {
  if (typeof window === 'undefined') {
    return; // SSR safety
  }

  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    cancelable: false,
  });

  window.dispatchEvent(event);
}

/**
 * Host analytics bridge installed by Cedros platform on public pages. Structural
 * subset of `window.cedrosAnalytics.trackExtensionEvent`; absent off-host.
 */
interface CedrosHostAnalytics {
  trackExtensionEvent?: (input: {
    extensionId: string;
    eventId: string;
    metadata?: Record<string, unknown>;
  }) => unknown;
}

declare global {
  interface Window {
    cedrosAnalytics?: CedrosHostAnalytics;
  }
}

/**
 * Best-effort forward of a Cedros Pay analytics event to the host pipeline.
 * No-ops off-host (SSR, third-party sites, or when the operator disabled
 * extension events). Only redacted, aggregate-safe metadata is passed — never
 * a wallet address, amount, resource id, or buyer identifier.
 */
function reportHostAnalyticsEvent(
  eventId: string,
  metadata: Record<string, unknown>
): void {
  if (typeof window === 'undefined') {
    return; // SSR safety
  }
  const track = window.cedrosAnalytics?.trackExtensionEvent;
  if (typeof track !== 'function') {
    return; // host bridge not present
  }
  try {
    void track({ extensionId: CEDROS_PAY_EXTENSION_ID, eventId, metadata });
  } catch {
    // Analytics is non-critical; never let a reporting error affect checkout.
  }
}

/**
 * Public-page analytics seam for catalog and program surfaces. Callers must
 * pass only bounded categorical values; invite/referral codes and identities
 * are deliberately not accepted or derived here.
 */
export function reportCedrosPayPublicEvent(
  eventId: string,
  metadata: Record<string, string | boolean | number | null>
): void {
  reportHostAnalyticsEvent(eventId, metadata);
}

/** Map the lib's `PaymentMethod` to the declared `paymentRail` enum. */
function paymentMethodToRail(method: PaymentMethod): string {
  switch (method) {
    case 'stripe':
      return 'stripe';
    case 'crypto':
      return 'x402';
    case 'credits':
      return 'credits';
    default:
      return 'unknown';
  }
}

/** Map a wallet adapter name to the declared `walletProviderKind` enum. */
function walletNameToProviderKind(wallet: WalletProvider): string {
  const name = String(wallet).toLowerCase();
  if (name.includes('walletconnect')) {
    return 'walletconnect';
  }
  if (name.includes('phantom') || name.includes('solflare') || name.includes('backpack')) {
    return 'browser-wallet';
  }
  return 'unknown';
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
  // Redacted: rail bucket only — never the resource id, item count, or amount.
  reportHostAnalyticsEvent(CEDROS_PAY_PAYMENT_STARTED_EVENT_ID, {
    sourceSurface: 'checkout-block',
    paymentRail: paymentMethodToRail(method),
    amountBucket: 'unknown',
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
  // Redacted: provider kind only — the manifest forbids the wallet address, so
  // `publicKey` is deliberately dropped from the host analytics payload.
  reportHostAnalyticsEvent(CEDROS_PAY_WALLET_CONNECTED_EVENT_ID, {
    sourceSurface: 'checkout-block',
    walletProviderKind: walletNameToProviderKind(wallet),
    network: 'solana',
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
