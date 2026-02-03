import { CommerceAdapter } from '../adapters/CommerceAdapter';
import { CheckoutMode } from '../types';
export type CedrosShopConfig = {
    brand?: {
        name: string;
        logoUrl?: string;
    };
    currency: string;
    customer?: {
        id?: string;
        email?: string;
        isSignedIn?: boolean;
    };
    checkout: {
        mode: CheckoutMode;
        requireEmail?: boolean;
        guestCheckout?: boolean;
        requireAccount?: boolean;
        allowPromoCodes?: boolean;
        allowShipping?: boolean;
        allowTaxDisplay?: boolean;
        allowTipping?: boolean;
        paymentMethods?: Array<{
            id: string;
            label: string;
            description?: string;
            ctaLabel?: string;
        }>;
        successUrl?: string;
        cancelUrl?: string;
    };
    ui?: {
        layout?: 'sidebar' | 'standard';
        productGrid?: {
            columns?: {
                base: number;
                md: number;
                lg: number;
            };
        };
    };
    cart?: {
        storageKey?: string;
        syncDebounceMs?: number;
    };
    adapter: CommerceAdapter;
};
//# sourceMappingURL=types.d.ts.map