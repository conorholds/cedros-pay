import { VariantProps } from 'class-variance-authority';
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
export declare const Sheet: React.FC<DialogPrimitive.DialogProps>;
export declare const SheetTrigger: React.ForwardRefExoticComponent<DialogPrimitive.DialogTriggerProps & React.RefAttributes<HTMLButtonElement>>;
export declare const SheetClose: React.ForwardRefExoticComponent<DialogPrimitive.DialogCloseProps & React.RefAttributes<HTMLButtonElement>>;
export declare const SheetPortal: React.FC<DialogPrimitive.DialogPortalProps>;
export declare const SheetOverlay: React.ForwardRefExoticComponent<Omit<DialogPrimitive.DialogOverlayProps & React.RefAttributes<HTMLDivElement>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const sheetContentVariants: (props?: ({
    side?: "bottom" | "left" | "right" | "top" | "popup" | null | undefined;
} & import('class-variance-authority/types').ClassProp) | undefined) => string;
export interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, VariantProps<typeof sheetContentVariants> {
}
export declare const SheetContent: React.ForwardRefExoticComponent<SheetContentProps & {
    overlayClassName?: string;
} & React.RefAttributes<HTMLDivElement>>;
export declare const SheetHeader: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => import("react/jsx-runtime").JSX.Element;
export declare const SheetTitle: React.ForwardRefExoticComponent<Omit<DialogPrimitive.DialogTitleProps & React.RefAttributes<HTMLHeadingElement>, "ref"> & React.RefAttributes<HTMLHeadingElement>>;
export declare const SheetDescription: React.ForwardRefExoticComponent<Omit<DialogPrimitive.DialogDescriptionProps & React.RefAttributes<HTMLParagraphElement>, "ref"> & React.RefAttributes<HTMLParagraphElement>>;
export {};
//# sourceMappingURL=sheet.d.ts.map