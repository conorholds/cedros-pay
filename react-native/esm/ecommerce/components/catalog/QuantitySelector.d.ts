import * as React from 'react';
import { ViewStyle } from 'react-native';
export interface QuantitySelectorProps {
    qty: number;
    onChange: (qty: number) => void;
    min?: number;
    max?: number;
    style?: ViewStyle;
}
export declare function QuantitySelector({ qty, onChange, min, max, style, }: QuantitySelectorProps): React.JSX.Element;
//# sourceMappingURL=QuantitySelector.d.ts.map