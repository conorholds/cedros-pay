import * as React from 'react';
import { View, Text, ViewStyle, StyleProp, TextStyle } from 'react-native';
interface DialogProps {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
}
export declare function Dialog({ children, open, onOpenChange, defaultOpen }: DialogProps): React.JSX.Element;
interface DialogTriggerProps {
    children: React.ReactNode;
    asChild?: boolean;
}
export declare function DialogTrigger({ children }: DialogTriggerProps): React.JSX.Element;
interface DialogContentProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}
export declare const DialogContent: React.ForwardRefExoticComponent<DialogContentProps & React.RefAttributes<View>>;
interface DialogHeaderProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}
export declare function DialogHeader({ children, style, ...props }: DialogHeaderProps): React.JSX.Element;
interface DialogFooterProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}
export declare function DialogFooter({ children, style, ...props }: DialogFooterProps): React.JSX.Element;
interface DialogTitleProps {
    children: React.ReactNode;
    style?: TextStyle;
}
export declare const DialogTitle: React.ForwardRefExoticComponent<DialogTitleProps & React.RefAttributes<Text>>;
interface DialogDescriptionProps {
    children: React.ReactNode;
    style?: TextStyle;
}
export declare const DialogDescription: React.ForwardRefExoticComponent<DialogDescriptionProps & React.RefAttributes<Text>>;
interface DialogCloseProps {
    children: React.ReactNode;
    asChild?: boolean;
}
export declare function DialogClose({ children }: DialogCloseProps): React.JSX.Element;
export {};
//# sourceMappingURL=dialog.d.ts.map