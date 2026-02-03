import { default as React } from 'react';
import { CheckoutFormValues } from './checkoutSchema';
import { CheckoutSessionResult } from '../../adapters/CommerceAdapter';
export type CheckoutStatus = 'idle' | 'validating' | 'creating_session' | 'redirecting' | 'error' | 'success';
export type CheckoutContextValue = {
    values: CheckoutFormValues;
    setValues: React.Dispatch<React.SetStateAction<CheckoutFormValues>>;
    setField: <K extends keyof CheckoutFormValues>(key: K, value: CheckoutFormValues[K]) => void;
    fieldErrors: Record<string, string>;
    status: CheckoutStatus;
    error: string | null;
    session: CheckoutSessionResult | null;
    reset: () => void;
    validate: () => {
        ok: true;
        values: CheckoutFormValues;
    } | {
        ok: false;
    };
    createCheckoutSession: (overrides?: {
        paymentMethodId?: string;
    }) => Promise<{
        ok: true;
        session: CheckoutSessionResult;
    } | {
        ok: false;
    }>;
};
export declare function CheckoutProvider({ children }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useCheckout(): CheckoutContextValue;
export declare function useStandaloneCheckout(): CheckoutContextValue;
//# sourceMappingURL=useCheckout.d.ts.map