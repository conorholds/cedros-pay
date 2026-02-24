import { describe, expect, it } from 'vitest';
import { parseCheckoutReturn } from '../hooks/checkoutReturn';

describe('ecommerce checkout return parsing', () => {
  it('treats session_id as success', () => {
    const res = parseCheckoutReturn({ session_id: 'cs_test_123' });
    expect(res.kind).toBe('success');
  });

  it('treats canceled=1 as cancel', () => {
    const res = parseCheckoutReturn({ canceled: '1' });
    expect(res.kind).toBe('cancel');
  });

  it('treats error as error', () => {
    const res = parseCheckoutReturn({ error: 'fail' });
    expect(res.kind).toBe('error');
  });
});
