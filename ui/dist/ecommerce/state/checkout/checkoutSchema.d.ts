import { z } from 'zod';
import { Address } from '../../types';
export declare function buildCheckoutSchema(opts: {
    requireEmail: boolean;
    requireName: boolean;
    requirePhone: boolean;
    requireShippingAddress: boolean;
    requireBillingAddress: boolean;
}): z.ZodObject<{
    email: z.ZodString | z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    name: z.ZodString | z.ZodOptional<z.ZodString>;
    phone: z.ZodString | z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    shippingAddress: z.ZodType<Address, unknown, z.core.$ZodTypeInternals<Address, unknown>> | z.ZodOptional<z.ZodType<Address, unknown, z.core.$ZodTypeInternals<Address, unknown>>>;
    billingAddress: z.ZodType<Address, unknown, z.core.$ZodTypeInternals<Address, unknown>> | z.ZodOptional<z.ZodType<Address, unknown, z.core.$ZodTypeInternals<Address, unknown>>>;
    discountCode: z.ZodOptional<z.ZodString>;
    tipAmount: z.ZodOptional<z.ZodNumber>;
    shippingMethodId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CheckoutFormValues = z.infer<ReturnType<typeof buildCheckoutSchema>>;
//# sourceMappingURL=checkoutSchema.d.ts.map