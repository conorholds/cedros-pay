import { CheckoutSessionResult } from '../../adapters/CommerceAdapter';
import * as React from 'react';
export declare function PaymentStep({ className, ctaLabel, renderEmbedded, embeddedFallback, renderCustom, customFallback, }: {
    className?: string;
    ctaLabel?: string;
    renderEmbedded?: (session: Extract<CheckoutSessionResult, {
        kind: 'embedded';
    }>) => React.ReactNode;
    embeddedFallback?: React.ReactNode;
    renderCustom?: (session: Extract<CheckoutSessionResult, {
        kind: 'custom';
    }>) => React.ReactNode;
    customFallback?: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=PaymentStep.d.ts.map