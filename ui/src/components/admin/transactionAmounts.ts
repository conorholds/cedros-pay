import { formatCurrencyAmount, formatMinorCurrencyAmount, formatStripeMinorAmount } from '../../i18n/formatting';
import type { Transaction } from './types';

export function transactionAmount(transaction: Transaction, locale?: string, refund = false): string {
  const minor = refund
    ? transaction.refundProgress?.requestedAmountMinor
      ?? (transaction.amountMinor === undefined ? undefined
        : transaction.amountMinor - (transaction.refundedAmountMinor ?? 0))
    : transaction.amountMinor;
  if (minor === undefined) return formatCurrencyAmount(transaction.amount, transaction.currency, locale);
  return transaction.method === 'stripe'
    ? formatStripeMinorAmount(minor, transaction.currency, locale)
    : formatMinorCurrencyAmount(minor, transaction.currency, locale);
}
