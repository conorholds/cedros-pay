import { describe, expect, it } from 'vitest';

import { cedrosPayServerRouteIds } from '../../extension/serverRouteIds';
import { cedrosPayServerRoutePolicies } from '../../extension/serverRoutePolicies';

describe('Cedros Pay server crawler policies', () => {
  it('classifies every packaged route exactly once and marks it noindex', () => {
    expect(cedrosPayServerRoutePolicies.map((policy) => policy.routeId)).toEqual(
      cedrosPayServerRouteIds
    );
    expect(new Set(cedrosPayServerRoutePolicies.map((policy) => policy.routeId)).size).toBe(
      cedrosPayServerRouteIds.length
    );
    expect(cedrosPayServerRoutePolicies.every((policy) => policy.indexability === 'noindex')).toBe(
      true
    );
    expect(cedrosPayServerRoutePolicies.every((policy) => policy.finalHeadOwner === 'none')).toBe(
      true
    );
  });

  it('classifies transactional ingress separately from feeds and ordinary APIs', () => {
    const byId = new Map(cedrosPayServerRoutePolicies.map((policy) => [policy.routeId, policy]));
    expect(byId.get('cedros-pay:webhooks')?.surfaceKind).toBe('webhook');
    expect(byId.get('cedros-pay:native-store-apple-notification')?.surfaceKind).toBe('callback');
    expect(byId.get('cedros-pay:product-rag-records')?.surfaceKind).toBe('feed');
    expect(byId.get('cedros-pay:checkout-create')?.sensitive).toBe(true);
    expect(byId.get('cedros-pay:product-read')?.sensitive).toBe(false);
  });
});
