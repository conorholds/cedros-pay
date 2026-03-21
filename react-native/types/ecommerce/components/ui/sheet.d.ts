import * as React from 'react';
import { View, Text, ViewStyle, StyleProp, TextStyle } from 'react-native';
type SheetSide = 'top' | 'bottom' | 'left' | 'right' | 'popup';
interface SheetProps {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
}
export declare function Sheet({ children, open, onOpenChange, defaultOpen }: SheetProps): React.JSX.Element;
interface SheetTriggerProps {
    children: React.ReactNode;
}
export declare function SheetTrigger({ children }: SheetTriggerProps): React.JSX.Element;
interface SheetContentProps {
    children: React.ReactNode;
    side?: SheetSide;
    style?: StyleProp<ViewStyle>;
}
export declare const SheetContent: React.ForwardRefExoticComponent<SheetContentProps & React.RefAttributes<View>>;
interface SheetHeaderProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}
export declare function SheetHeader({ children, style, ...props }: SheetHeaderProps): React.JSX.Element;
interface SheetTitleProps {
    children: React.ReactNode;
    style?: TextStyle;
}
export declare const SheetTitle: React.ForwardRefExoticComponent<SheetTitleProps & React.RefAttributes<Text>>;
interface SheetDescriptionProps {
    children: React.ReactNode;
    style?: TextStyle;
}
export declare const SheetDescription: React.ForwardRefExoticComponent<SheetDescriptionProps & React.RefAttributes<Text>>;
interface SheetCloseProps {
    children: React.ReactNode;
}
export declare function SheetClose({ children }: SheetCloseProps): React.JSX.Element;
export {};
//# sourceMappingURL=sheet.d.ts.map