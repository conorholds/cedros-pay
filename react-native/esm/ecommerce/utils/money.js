export function formatMoney({ amount, currency }) {
    // Amount is expected in major units.
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
    }).format(amount);
}
//# sourceMappingURL=money.js.map