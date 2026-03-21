import * as React from 'react';
import { TouchableOpacity, ViewStyle, StyleProp, TextStyle } from 'react-native';
type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg';
export interface ButtonProps {
    children: React.ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
    textStyle?: TextStyle;
}
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<TouchableOpacity>>;
export {};
//# sourceMappingURL=button.d.ts.map