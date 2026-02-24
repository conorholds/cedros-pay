export type Money = {
  amount: number;
  currency: string;
};

export function formatMoney({ amount, currency }: Money) {
  // Amount is expected in major units.
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount);
}
