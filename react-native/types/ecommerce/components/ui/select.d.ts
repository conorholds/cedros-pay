import * as React from 'react';
import { View, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
interface SelectProps {
    children: React.ReactNode;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
}
export declare function Select({ children, value: controlledValue, defaultValue, onValueChange }: SelectProps): React.JSX.Element;
interface SelectTriggerProps {
    children?: React.ReactNode;
    style?: ViewStyle;
}
export declare const SelectTrigger: React.ForwardRefExoticComponent<SelectTriggerProps & React.RefAttributes<TouchableOpacity>>;
interface SelectValueProps {
    placeholder?: string;
}
export declare function SelectValue({ placeholder }: SelectValueProps): React.JSX.Element;
interface SelectContentProps {
    children: React.ReactNode;
    style?: ViewStyle;
}
export declare const SelectContent: React.ForwardRefExoticComponent<SelectContentProps & React.RefAttributes<View>>;
interface SelectItemProps {
    children: React.ReactNode;
    value: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
}
export declare const SelectItem: React.ForwardRefExoticComponent<SelectItemProps & React.RefAttributes<TouchableOpacity>>;
interface SelectGroupProps {
    children: React.ReactNode;
}
export declare function SelectGroup({ children }: SelectGroupProps): React.JSX.Element;
export {};
//# sourceMappingURL=select.d.ts.map