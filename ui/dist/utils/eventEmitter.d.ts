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
export declare const CEDROS_EVENTS: {
    readonly PAYMENT_START: "cedros:payment:start";
    readonly WALLET_CONNECT: "cedros:wallet:connect";
    readonly WALLET_CONNECTED: "cedros:wallet:connected";
    readonly WALLET_ERROR: "cedros:wallet:error";
    readonly PAYMENT_PROCESSING: "cedros:payment:processing";
    readonly PAYMENT_SUCCESS: "cedros:payment:success";
    readonly PAYMENT_ERROR: "cedros:payment:error";
};
/**
 * Emit payment start event
 */
export declare function emitPaymentStart(method: PaymentMethod, resource?: string, itemCount?: number): void;
/**
 * Emit wallet connect event (connection initiated)
 */
export declare function emitWalletConnect(wallet: WalletProvider): void;
/**
 * Emit wallet connected event (connection successful)
 */
export declare function emitWalletConnected(wallet: WalletProvider, publicKey: string): void;
/**
 * Emit wallet error event
 */
export declare function emitWalletError(error: string, wallet?: WalletProvider): void;
/**
 * Emit payment processing event
 */
export declare function emitPaymentProcessing(method: PaymentMethod, resource?: string, itemCount?: number): void;
/**
 * Emit payment success event
 */
export declare function emitPaymentSuccess(method: PaymentMethod, transactionId: string, resource?: string, itemCount?: number): void;
/**
 * Emit payment error event
 */
export declare function emitPaymentError(method: PaymentMethod, error: string, resource?: string, itemCount?: number): void;
export {};
//# sourceMappingURL=eventEmitter.d.ts.map