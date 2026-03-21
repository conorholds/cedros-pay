"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CEDROS_EVENTS = void 0;
exports.subscribeToEvent = subscribeToEvent;
exports.emitPaymentStart = emitPaymentStart;
exports.emitWalletConnect = emitWalletConnect;
exports.emitWalletConnected = emitWalletConnected;
exports.emitWalletError = emitWalletError;
exports.emitPaymentProcessing = emitPaymentProcessing;
exports.emitPaymentSuccess = emitPaymentSuccess;
exports.emitPaymentError = emitPaymentError;
/**
 * Event name constants
 */
exports.CEDROS_EVENTS = {
    PAYMENT_START: 'cedros:payment:start',
    WALLET_CONNECT: 'cedros:wallet:connect',
    WALLET_CONNECTED: 'cedros:wallet:connected',
    WALLET_ERROR: 'cedros:wallet:error',
    PAYMENT_PROCESSING: 'cedros:payment:processing',
    PAYMENT_SUCCESS: 'cedros:payment:success',
    PAYMENT_ERROR: 'cedros:payment:error',
};
/**
 * Event emitter for React Native
 *
 * Uses a simple callback-based approach since React Native doesn't have
 * a DOM or CustomEvent. Consumers can subscribe to events via callbacks.
 */
// Store event listeners
const eventListeners = new Map();
/**
 * Subscribe to an event
 * @param eventName - The event name to listen for
 * @param callback - Function to call when event is emitted
 * @returns Unsubscribe function
 */
function subscribeToEvent(eventName, callback) {
    if (!eventListeners.has(eventName)) {
        eventListeners.set(eventName, new Set());
    }
    const listeners = eventListeners.get(eventName);
    listeners.add(callback);
    // Return unsubscribe function
    return () => {
        listeners.delete(callback);
    };
}
/**
 * Emit an event
 * @param eventName - The event name
 * @param detail - The event detail payload
 */
function emitEvent(eventName, detail) {
    const listeners = eventListeners.get(eventName);
    if (listeners) {
        listeners.forEach((callback) => {
            try {
                callback(detail);
            }
            catch (error) {
                console.error(`Error in event listener for ${eventName}:`, error);
            }
        });
    }
}
/**
 * Emit payment start event
 */
function emitPaymentStart(method, resource, itemCount) {
    emitEvent(exports.CEDROS_EVENTS.PAYMENT_START, {
        timestamp: Date.now(),
        method,
        resource,
        itemCount,
    });
}
/**
 * Emit wallet connect event (connection initiated)
 */
function emitWalletConnect(wallet) {
    emitEvent(exports.CEDROS_EVENTS.WALLET_CONNECT, {
        timestamp: Date.now(),
        wallet,
    });
}
/**
 * Emit wallet connected event (connection successful)
 */
function emitWalletConnected(wallet, publicKey) {
    emitEvent(exports.CEDROS_EVENTS.WALLET_CONNECTED, {
        timestamp: Date.now(),
        wallet,
        publicKey,
    });
}
/**
 * Emit wallet error event
 */
function emitWalletError(error, wallet) {
    emitEvent(exports.CEDROS_EVENTS.WALLET_ERROR, {
        timestamp: Date.now(),
        wallet,
        error,
    });
}
/**
 * Emit payment processing event
 */
function emitPaymentProcessing(method, resource, itemCount) {
    emitEvent(exports.CEDROS_EVENTS.PAYMENT_PROCESSING, {
        timestamp: Date.now(),
        method,
        resource,
        itemCount,
    });
}
/**
 * Emit payment success event
 */
function emitPaymentSuccess(method, transactionId, resource, itemCount) {
    emitEvent(exports.CEDROS_EVENTS.PAYMENT_SUCCESS, {
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
function emitPaymentError(method, error, resource, itemCount) {
    emitEvent(exports.CEDROS_EVENTS.PAYMENT_ERROR, {
        timestamp: Date.now(),
        method,
        error,
        resource,
        itemCount,
    });
}
//# sourceMappingURL=eventEmitter.js.map