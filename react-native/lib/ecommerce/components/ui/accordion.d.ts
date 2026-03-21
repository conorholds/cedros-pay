import * as React from 'react';
import { View, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
interface AccordionProps {
    children: React.ReactNode;
    type?: 'single' | 'multiple';
    value?: string | string[];
    defaultValue?: string | string[];
    onValueChange?: (value: string | string[]) => void;
    collapsible?: boolean;
}
export declare function Accordion({ children, type, value: controlledValue, defaultValue, onValueChange, collapsible, }: AccordionProps): React.JSX.Element;
interface AccordionItemProps {
    children: React.ReactNode;
    value: string;
    style?: ViewStyle;
}
export declare const AccordionItem: React.ForwardRefExoticComponent<AccordionItemProps & React.RefAttributes<View>>;
interface AccordionTriggerProps {
    children: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
}
export declare const AccordionTrigger: React.ForwardRefExoticComponent<AccordionTriggerProps & React.RefAttributes<TouchableOpacity>>;
interface AccordionContentProps {
    children: React.ReactNode;
    style?: ViewStyle;
}
export declare const AccordionContent: React.ForwardRefExoticComponent<AccordionContentProps & React.RefAttributes<any>>;
export {};
//# sourceMappingURL=accordion.d.ts.map