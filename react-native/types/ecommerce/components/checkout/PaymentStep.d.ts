import * as React from 'react';
import { ViewStyle } from 'react-native';
import type { CheckoutSessionResult } from '../../adapters/CommerceAdapter';
interface PaymentStepProps {
    style?: ViewStyle;
    ctaLabel?: string;
    renderEmbedded?: (session: Extract<CheckoutSessionResult, {
        kind: 'embedded';
    }>) => React.ReactNode;
    embeddedFallback?: React.ReactNode;
    renderCustom?: (session: Extract<CheckoutSessionResult, {
        kind: 'custom';
    }>) => React.ReactNode;
    customFallback?: React.ReactNode;
}
export declare function PaymentStep({ style, ctaLabel, renderEmbedded, embeddedFallback, renderCustom, customFallback, }: PaymentStepProps): React.JSX.Element;
export {};
//# sourceMappingURL=PaymentStep.d.ts.map