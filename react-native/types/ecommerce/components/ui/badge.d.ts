import * as React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
type BadgeVariant = 'default' | 'secondary' | 'outline';
export interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    style?: ViewStyle;
    textStyle?: TextStyle;
}
export declare function Badge({ children, variant, style, textStyle, ...props }: BadgeProps): React.JSX.Element;
export {};
//# sourceMappingURL=badge.d.ts.map