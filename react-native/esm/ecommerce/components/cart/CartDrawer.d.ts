import * as React from 'react';
import { ViewStyle } from 'react-native';
type SheetSide = 'top' | 'bottom' | 'left' | 'right' | 'popup';
interface CartDrawerProps {
    trigger?: React.ReactNode;
    side?: SheetSide;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onCheckout: () => void;
    preferredTab?: 'cart' | 'chat';
    style?: ViewStyle;
    /** Optional chat component to render in chat tab */
    chatComponent?: React.ReactNode;
}
export declare function CartDrawer({ trigger, side, open, onOpenChange, onCheckout, preferredTab, style, chatComponent, }: CartDrawerProps): React.JSX.Element;
interface MiniCartProps {
    onPress?: () => void;
    style?: ViewStyle;
}
export declare function MiniCart({ onPress, style }: MiniCartProps): React.JSX.Element | null;
export {};
//# sourceMappingURL=CartDrawer.d.ts.map