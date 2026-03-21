import * as React from 'react';
import { ViewStyle } from 'react-native';
type CheckoutStep = {
    id: string;
    label: string;
    description?: string;
};
interface CheckoutStepsProps {
    /** Array of checkout steps */
    steps: CheckoutStep[];
    /** Current active step index (0-based) */
    currentStep: number;
    /** Additional style for the container */
    style?: ViewStyle;
}
/**
 * Checkout Steps Component
 *
 * Displays a step indicator/progress bar for multi-step checkout flows.
 * Shows completed, current, and upcoming steps.
 */
export declare function CheckoutSteps({ steps, currentStep, style, }: CheckoutStepsProps): React.JSX.Element;
export {};
//# sourceMappingURL=CheckoutSteps.d.ts.map