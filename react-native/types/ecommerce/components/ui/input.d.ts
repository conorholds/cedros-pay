import * as React from 'react';
import { TextInput, TextInputProps, ViewStyle, TextStyle } from 'react-native';
export interface InputProps extends Omit<TextInputProps, 'style'> {
    style?: ViewStyle & TextStyle;
}
export declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<TextInput>>;
//# sourceMappingURL=input.d.ts.map