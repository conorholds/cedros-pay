import { CartItem } from '../types';
export type RequirementLevel = 'none' | 'optional' | 'required';
export type CheckoutRequirements = {
    email: RequirementLevel;
    name: RequirementLevel;
    phone: RequirementLevel;
    shippingAddress: boolean;
    billingAddress: boolean;
    fulfillmentNotes?: string;
    isDigitalOnly: boolean;
    hasPhysical: boolean;
};
export declare function getCartCheckoutRequirements(items: CartItem[], base: {
    requireEmail: boolean;
    defaultMode: 'none' | 'minimal' | 'shipping' | 'full';
    allowShipping: boolean;
}): CheckoutRequirements;
//# sourceMappingURL=cartCheckoutRequirements.d.ts.map