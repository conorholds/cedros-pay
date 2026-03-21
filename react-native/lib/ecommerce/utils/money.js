"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMoney = formatMoney;
function formatMoney({ amount, currency }) {
    // Amount is expected in major units.
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
    }).format(amount);
}
//# sourceMappingURL=money.js.map