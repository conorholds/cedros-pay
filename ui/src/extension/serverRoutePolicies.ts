import { cedrosPayServerRouteIds } from './serverRouteIds';

export type CedrosPaySurfaceKind = 'api' | 'admin' | 'callback' | 'webhook' | 'feed';

export interface CedrosPayServerRoutePolicy {
  routeId: (typeof cedrosPayServerRouteIds)[number];
  surfaceKind: CedrosPaySurfaceKind;
  indexability: 'noindex';
  robots: 'noindex, nofollow, nosnippet';
  finalHeadOwner: 'none';
  sensitive: boolean;
}

const CALLBACK_ROUTES = new Set<string>([
  'cedros-pay:native-store-apple-notification',
  'cedros-pay:native-store-google-notification',
  'cedros-pay:native-store-verify',
  'cedros-pay:checkout-return-verify',
]);

const WEBHOOK_ROUTES = new Set<string>(['cedros-pay:webhooks']);
const FEED_ROUTES = new Set<string>(['cedros-pay:product-rag-records']);

const TRANSACTIONAL_PREFIXES = [
  'cedros-pay:portal-orders-',
  'cedros-pay:assistant-x402-',
  'cedros-pay:checkout-',
  'cedros-pay:ucp-checkout-',
  'cedros-pay:ucp-handoff',
  'cedros-pay:versioned-cart-',
  'cedros-pay:subscription-',
  'cedros-pay:subscriptions-',
  'cedros-pay:refunds-',
] as const;

const TRANSACTIONAL_ROUTES = new Set<string>([
  'cedros-pay:compliance-check',
  'cedros-pay:purchases',
  'cedros-pay:payments',
  'cedros-pay:credits-balance',
  'cedros-pay:entitlements',
]);

function classify(routeId: string): { surfaceKind: CedrosPaySurfaceKind; sensitive: boolean } {
  if (routeId === 'cedros-pay:domain-checkout' || routeId === 'cedros-pay:admin' || routeId.startsWith('cedros-pay:admin-') || routeId.startsWith('cedros-pay:ai-')) {
    return { surfaceKind: 'admin', sensitive: true };
  }
  if (CALLBACK_ROUTES.has(routeId)) return { surfaceKind: 'callback', sensitive: true };
  if (WEBHOOK_ROUTES.has(routeId)) return { surfaceKind: 'webhook', sensitive: true };
  if (FEED_ROUTES.has(routeId)) return { surfaceKind: 'feed', sensitive: false };
  const transactional =
    TRANSACTIONAL_ROUTES.has(routeId) ||
    TRANSACTIONAL_PREFIXES.some((prefix) => routeId.startsWith(prefix));
  return { surfaceKind: 'api', sensitive: transactional };
}

/**
 * Complete crawler policy for the packaged server inventory. Cedros Pay owns no
 * public HTML route; Product/Category pages are host-controlled Shop surfaces.
 */
export const cedrosPayServerRoutePolicies: readonly CedrosPayServerRoutePolicy[] =
  cedrosPayServerRouteIds.map((routeId) => ({
    routeId,
    ...classify(routeId),
    indexability: 'noindex',
    robots: 'noindex, nofollow, nosnippet',
    finalHeadOwner: 'none',
  }));
