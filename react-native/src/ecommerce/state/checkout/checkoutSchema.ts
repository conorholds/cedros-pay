import { z } from 'zod';
import type { Address } from '../../types';

const addressSchema: z.ZodType<Address> = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
});

export function buildCheckoutSchema(opts: {
  requireEmail: boolean;
  requireName: boolean;
  requirePhone: boolean;
  requireShippingAddress: boolean;
  requireBillingAddress: boolean;
}) {
  return z.object({
    email: opts.requireEmail
      ? z.string().email('Valid email required')
      : z.string().email('Valid email required').optional(),
    name: opts.requireName ? z.string().min(1, 'Name is required') : z.string().optional(),
    phone: opts.requirePhone ? z.string().min(6, 'Phone is required') : z.string().optional(),
    notes: z.string().max(500).optional(),
    shippingAddress: opts.requireShippingAddress ? addressSchema : addressSchema.optional(),
    billingAddress: opts.requireBillingAddress ? addressSchema : addressSchema.optional(),
    discountCode: z.string().optional(),
    tipAmount: z.number().min(0).optional(),
    shippingMethodId: z.string().optional(),
  });
}

export type CheckoutFormValues = z.infer<ReturnType<typeof buildCheckoutSchema>>;
