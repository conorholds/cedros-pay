"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCheckoutSchema = buildCheckoutSchema;
const zod_1 = require("zod");
const addressSchema = zod_1.z.object({
    line1: zod_1.z.string().min(1, 'Address line 1 is required'),
    line2: zod_1.z.string().optional(),
    city: zod_1.z.string().min(1, 'City is required'),
    state: zod_1.z.string().optional(),
    postalCode: zod_1.z.string().min(1, 'Postal code is required'),
    country: zod_1.z.string().min(2, 'Country is required'),
});
function buildCheckoutSchema(opts) {
    return zod_1.z.object({
        email: opts.requireEmail
            ? zod_1.z.string().email('Valid email required')
            : zod_1.z.string().email('Valid email required').optional(),
        name: opts.requireName ? zod_1.z.string().min(1, 'Name is required') : zod_1.z.string().optional(),
        phone: opts.requirePhone ? zod_1.z.string().min(6, 'Phone is required') : zod_1.z.string().optional(),
        notes: zod_1.z.string().max(500).optional(),
        shippingAddress: opts.requireShippingAddress ? addressSchema : addressSchema.optional(),
        billingAddress: opts.requireBillingAddress ? addressSchema : addressSchema.optional(),
        discountCode: zod_1.z.string().optional(),
        tipAmount: zod_1.z.number().min(0).optional(),
        shippingMethodId: zod_1.z.string().optional(),
    });
}
//# sourceMappingURL=checkoutSchema.js.map