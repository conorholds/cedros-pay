import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CEDROS_PAY_PAYMENT_FAILED_EVENT_ID,
  CEDROS_PAY_PAYMENT_SUCCEEDED_EVENT_ID,
  CEDROS_PAY_REFUND_SETTLED_EVENT_ID,
} from '../../extension/constants';

function readArchiveJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(resolve(__dirname, '../../../../', fileName), 'utf8')) as T;
}

describe('dashboard revenue contracts', () => {
  it('publishes stable minimum event payload fields for core dashboard consumers', () => {
    const analyticsPlan = readArchiveJson<{
      events: Array<{
        eventId: string;
        safeProperties: { properties: Record<string, unknown>; required?: string[] };
      }>;
    }>('cedros-extension.analytics.json');

    for (const eventId of [
      CEDROS_PAY_PAYMENT_SUCCEEDED_EVENT_ID,
      CEDROS_PAY_PAYMENT_FAILED_EVENT_ID,
      CEDROS_PAY_REFUND_SETTLED_EVENT_ID,
    ]) {
      const event = analyticsPlan.events.find((candidate) => candidate.eventId === eventId);
      expect(event?.safeProperties.properties).toEqual(
        expect.objectContaining({
          amount_cents: expect.any(Object),
          currency: expect.any(Object),
          flow: expect.any(Object),
          occurred_at: expect.any(Object),
        })
      );
      expect(event?.safeProperties.required).toEqual(
        expect.arrayContaining(['amount_cents', 'currency', 'flow', 'occurred_at'])
      );
    }
  });

  it('publishes an approved privacy gate signal for production dashboard enablement', () => {
    const release = readArchiveJson<{
      privacyReview?: {
        dashboardRevenueContracts?: {
          status?: string;
          gateSignal?: string;
          reviewer?: { name?: string; approvedAt?: string };
        };
      };
    }>('cedros-extension.release-readiness.json');
    const review = release.privacyReview?.dashboardRevenueContracts;

    expect(review?.status).toBe('approved');
    expect(review?.gateSignal).toBe(
      'privacyReview.dashboardRevenueContracts.status == "approved"'
    );
    expect(review?.reviewer?.name).toBeTruthy();
    expect(review?.reviewer?.approvedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it('documents the stable stats include query contract and discovery path', () => {
    const handoff = readArchiveJson<{
      routeContracts: Array<{
        routeId: string;
        methods: string[];
        path: string;
        requestSchema: string;
        routeDiscovery?: string;
        examples?: Array<{ request: string; response: Record<string, unknown> }>;
      }>;
    }>('cedros-extension.host-handoff.json');
    const stats = handoff.routeContracts.find((route) => route.routeId === 'cedros-pay:stats');

    expect(stats?.methods).toEqual(['GET']);
    expect(stats?.path).toBe('/stats/v1/summary');
    expect(stats?.requestSchema).toContain('include');
    expect(stats?.requestSchema).toContain(
      'revenue,subscriptions,timeseries,topRoutes,topProducts,comparison'
    );
    expect(stats?.requestSchema).toContain('comparison is opt-in only');
    expect(stats?.requestSchema).toContain('comma-separated string');
    expect(stats?.routeDiscovery).toContain('routeId cedros-pay:stats');
    expect(stats?.examples?.[0]?.request).toContain('include=revenue,comparison');
    expect(stats?.examples?.[1]?.request).toContain('include=subscriptions');
  });
});
