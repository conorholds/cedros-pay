import type { CheckoutReturnResult } from '../adapters/CommerceAdapter';

function get(query: Record<string, string | undefined>, ...keys: string[]) {
  for (const k of keys) {
    const v = query[k];
    if (v) return v;
  }
  return undefined;
}

export function parseCheckoutReturn(query: Record<string, string | undefined>): CheckoutReturnResult {
  const error = get(query, 'error', 'error_message', 'message');
  if (error) return { kind: 'error', message: error };

  const cancelled = get(query, 'canceled', 'cancelled', 'cancel', 'canceled_at');
  if (cancelled && cancelled !== '0' && cancelled !== 'false') return { kind: 'cancel' };

  const orderId = get(query, 'orderId', 'order_id', 'demoOrderId');
  const stripeSessionId = get(query, 'session_id', 'checkout_session_id');

  // Treat presence of a payment session id as success signal (provider callback pattern)
  if (orderId || stripeSessionId) return { kind: 'success', orderId: orderId ?? stripeSessionId };

  const status = (get(query, 'status', 'checkout') ?? '').toLowerCase();
  if (status === 'success') return { kind: 'success', orderId };
  if (status === 'cancel' || status === 'canceled') return { kind: 'cancel' };
  if (status === 'error') return { kind: 'error' };

  return { kind: 'idle' };
}
