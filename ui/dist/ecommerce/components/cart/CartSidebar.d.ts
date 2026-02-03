import * as React from 'react';
export declare function CartSidebar({ trigger, side, open, onOpenChange, onCheckout, preferredTab, className, }: {
    trigger?: React.ReactNode;
    side?: 'right' | 'left' | 'bottom' | 'popup';
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onCheckout: () => void;
    preferredTab?: 'cart' | 'chat';
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=CartSidebar.d.ts.map