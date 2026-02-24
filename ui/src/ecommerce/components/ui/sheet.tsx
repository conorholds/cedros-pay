import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-sm transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
      className
    )}
    {...props}
  />
));

SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetContentVariants = cva(
  'fixed z-50 gap-4 bg-white p-6 shadow-lg outline-none transition duration-200 ease-out dark:bg-neutral-950',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b border-neutral-200 data-[state=closed]:-translate-y-full data-[state=open]:translate-y-0 dark:border-neutral-800',
        bottom:
          'inset-x-0 bottom-0 border-t border-neutral-200 data-[state=closed]:translate-y-full data-[state=open]:translate-y-0 dark:border-neutral-800',
        left:
          'inset-y-0 left-0 h-full w-3/4 border-r border-neutral-200 data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0 sm:max-w-sm dark:border-neutral-800',
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l border-neutral-200 data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 sm:max-w-sm dark:border-neutral-800',
        popup:
          'bottom-4 right-4 w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl border border-neutral-200 p-4 data-[state=closed]:translate-y-2 data-[state=open]:translate-y-0 data-[state=closed]:opacity-0 data-[state=open]:opacity-100 data-[state=closed]:scale-95 data-[state=open]:scale-100 dark:border-neutral-800',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
);

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetContentVariants> {}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps & { overlayClassName?: string }
>(({ side = 'right', className, children, overlayClassName, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay className={overlayClassName} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetContentVariants({ side }), className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </SheetPortal>
));

SheetContent.displayName = DialogPrimitive.Content.displayName;

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-left', className)} {...props} />
);

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));

SheetTitle.displayName = DialogPrimitive.Title.displayName;

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}
    {...props}
  />
));

SheetDescription.displayName = DialogPrimitive.Description.displayName;
