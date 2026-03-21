import * as React from 'react';
import { TextInput, TextInputProps, ViewStyle, TextStyle } from 'react-native';
export interface TextareaProps extends Omit<TextInputProps, 'style' | 'multiline'> {
    style?: ViewStyle & TextStyle;
}
export declare const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<TextInput>>;
//# sourceMappingURL=textarea.d.ts.map