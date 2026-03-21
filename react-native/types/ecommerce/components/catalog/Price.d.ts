import * as React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
export interface PriceProps {
    amount: number;
    currency: string;
    compareAt?: number;
    size?: 'sm' | 'default';
    style?: ViewStyle;
    textStyle?: TextStyle;
}
export declare function Price({ amount, currency, compareAt, size, style, textStyle, }: PriceProps): React.JSX.Element;
//# sourceMappingURL=Price.d.ts.map