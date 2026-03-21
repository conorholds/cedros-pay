import * as React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
type CTASize = 'sm' | 'md' | 'lg';
type CTAVariant = 'primary' | 'secondary' | 'outline';
export interface CTAButtonProps {
    children: React.ReactNode;
    onPress?: () => void;
    variant?: CTAVariant;
    size?: CTASize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
}
export declare function CTAButton({ children, onPress, variant, size, disabled, loading, fullWidth, style, textStyle, }: CTAButtonProps): React.JSX.Element;
export {};
//# sourceMappingURL=CTAButton.d.ts.map