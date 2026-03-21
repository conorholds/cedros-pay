import * as React from 'react';
import { View, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
interface TabsProps {
    children: React.ReactNode;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
}
export declare function Tabs({ children, value: controlledValue, defaultValue, onValueChange }: TabsProps): React.JSX.Element;
interface TabsListProps {
    children: React.ReactNode;
    style?: ViewStyle;
}
export declare const TabsList: React.ForwardRefExoticComponent<TabsListProps & React.RefAttributes<View>>;
interface TabsTriggerProps {
    children: React.ReactNode;
    value: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
    activeStyle?: ViewStyle;
    activeTextStyle?: TextStyle;
}
export declare const TabsTrigger: React.ForwardRefExoticComponent<TabsTriggerProps & React.RefAttributes<TouchableOpacity>>;
interface TabsContentProps {
    children: React.ReactNode;
    value: string;
    style?: ViewStyle;
}
export declare const TabsContent: React.ForwardRefExoticComponent<TabsContentProps & React.RefAttributes<View>>;
export {};
//# sourceMappingURL=tabs.d.ts.map