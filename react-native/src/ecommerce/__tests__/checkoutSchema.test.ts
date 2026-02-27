import { describe, expect, it } from 'vitest';
import { buildCheckoutSchema } from '../state/checkout/checkoutSchema';

describe('ecommerce checkout schema', () => {
  it('requires a valid email when requireEmail=true', () => {
    const schema = buildCheckoutSchema({
      requireEmail: true,
      requireName: false,
      requirePhone: false,
      requireShippingAddress: false,
      requireBillingAddress: false,
    });
    const res = schema.safeParse({});
    expect(res.success).toBe(false);
  });

  it('requires name when requireName=true', () => {
    const schema = buildCheckoutSchema({
      requireEmail: true,
      requireName: true,
      requirePhone: false,
      requireShippingAddress: false,
      requireBillingAddress: false,
    });
    const res = schema.safeParse({ email: 'a@b.com' });
    expect(res.success).toBe(false);
  });

  it('requires shipping address when requireShippingAddress=true', () => {
    const schema = buildCheckoutSchema({
      requireEmail: true,
      requireName: true,
      requirePhone: false,
      requireShippingAddress: true,
      requireBillingAddress: false,
    });
    const res = schema.safeParse({ email: 'a@b.com', name: 'A' });
    expect(res.success).toBe(false);
  });
});
