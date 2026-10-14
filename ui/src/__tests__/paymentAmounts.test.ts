import { describe, expect, it } from 'vitest';
import { formatMinorCurrencyAmount, formatStripeMinorAmount } from '../i18n/formatting';
import { transactionAmount } from '../components/admin/transactionAmounts';
import type { Transaction } from '../components/admin/types';

describe('financial amount display', () => {
  it.each([
    [1234, 'USD', 12.34], [500, 'JPY', 500], [1234, 'KWD', 1.234],
    [500, 'ISK', 5], [500, 'UGX', 5], [1045, 'HUF', 10.45], [1045, 'TWD', 10.45], [500, 'MGA', 500],
  ])('displays Stripe amount %s %s in its charge units', (minor, currency, major) => {
    expect(formatStripeMinorAmount(minor, currency, 'de-DE')).toBe(
      new Intl.NumberFormat('de-DE', { style: 'currency', currency,
        ...(['ISK', 'UGX'].includes(currency) ? { maximumFractionDigits: 2 } : {}),
        ...(['HUF', 'TWD'].includes(currency) ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {}),
        ...(currency === 'MGA' ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
      }).format(major)
    );
  });

  it('uses ISO units for non-Stripe amounts and rejects unsafe numbers', () => {
    expect(formatMinorCurrencyAmount(500, 'JPY', 'en-US')).toBe('¥500');
    expect(formatMinorCurrencyAmount(NaN, 'USD')).toBe('Amount unavailable');
    expect(formatStripeMinorAmount(Number.MAX_SAFE_INTEGER + 1, 'USD')).toBe('Amount unavailable');
    expect(formatMinorCurrencyAmount(100, '<invalid>')).toBe('Amount unavailable');
  });

  it('shows the remaining refund or the frozen amount of an existing operation', () => {
    const transaction: Transaction = {
      id: 'pay', resourceId: 'product', amount: 15, amountMinor: 1500, refundedAmountMinor: 500,
      currency: 'USD', method: 'stripe', status: 'completed', paidAt: '2026-01-01',
    };
    expect(transactionAmount(transaction, 'en-US')).toBe('$15.00');
    expect(transactionAmount(transaction, 'en-US', true)).toBe('$10.00');
    transaction.refundProgress = { status: 'unresolved', requestedAmountMinor: 700 };
    expect(transactionAmount(transaction, 'en-US', true)).toBe('$7.00');
  });
});
