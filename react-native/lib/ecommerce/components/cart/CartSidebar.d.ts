import * as React from 'react';
import { ViewStyle } from 'react-native';
type SheetSide = 'top' | 'bottom' | 'left' | 'right' | 'popup';
interface CartSidebarProps {
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
export declare function CartSidebar({ trigger, side, open, onOpenChange, onCheckout, preferredTab, style, chatComponent, }: CartSidebarProps): React.JSX.Element;
export {};
//# sourceMappingURL=CartSidebar.d.ts.map