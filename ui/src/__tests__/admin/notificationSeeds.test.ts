import { describe, expect, it } from 'vitest';
import registerCedrosPayAdminSurface from '../../admin/register';
import {
  CEDROS_PAY_PAYMENT_SUCCEEDED_EVENT_ID,
  CEDROS_PAY_REFUND_SETTLED_EVENT_ID,
} from '../../extension/constants';

const FORBIDDEN_TEMPLATE_CONTEXT =
  /\{\{\s*(email|user|session|token|password|ip|wallet|auth|provider|processor|stripe|card|customer|paymentIntent)/iu;

describe('notification setup seeds', () => {
  it('does not declare setup product seeds', () => {
    const bootstrap = registerCedrosPayAdminSurface();
    const products = bootstrap.manifest.setupSeeds?.products ?? [];

    expect(products).toEqual([]);
  });

  it('keeps product seeds empty so host surfaces read configured catalog products', () => {
    const bootstrap = registerCedrosPayAdminSurface();
    const products = bootstrap.manifest.setupSeeds?.products ?? [];
    const serialized = JSON.stringify(products);

    expect(products).toHaveLength(0);
    expect(serialized).not.toMatch(FORBIDDEN_TEMPLATE_CONTEXT);
    expect(serialized).not.toMatch(
      /wallet address|stripe customer|payment intent|buyer|purchase history/iu
    );
  });

  it('declares purchase and refund team routes for published server events', () => {
    const bootstrap = registerCedrosPayAdminSurface();
    const serverEvents = new Set(bootstrap.manifest.surfaces.server.events ?? []);
    const notifications = bootstrap.manifest.setupSeeds?.notifications ?? [];

    expect(notifications.map((seed) => seed.eventId)).toEqual([
      CEDROS_PAY_PAYMENT_SUCCEEDED_EVENT_ID,
      CEDROS_PAY_REFUND_SETTLED_EVENT_ID,
    ]);
    expect(notifications.every((seed) => serverEvents.has(seed.eventId))).toBe(true);
    expect(notifications.every((seed) => seed.audience === 'team')).toBe(true);
    expect(new Set(notifications.map((seed) => seed.id)).size).toBe(2);
  });

  it('keeps notification templates redacted and operator scoped', () => {
    const bootstrap = registerCedrosPayAdminSurface();
    const notifications = bootstrap.manifest.setupSeeds?.notifications ?? [];
    const serialized = JSON.stringify(notifications);

    expect(notifications.every((seed) => seed.defaultChannels?.includes('email'))).toBe(true);
    expect(serialized).not.toMatch(FORBIDDEN_TEMPLATE_CONTEXT);
    expect(serialized).not.toMatch(
      /wallet address|card number|payment instrument|processor payload/iu
    );
  });
});
