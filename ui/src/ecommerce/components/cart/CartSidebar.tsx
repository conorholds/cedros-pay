import * as React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTrigger } from '../ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { CartPanel } from './CartPanel';
import { ShopChatPanel } from '../chat/ShopChatPanel';

export function CartSidebar({
  trigger,
  side = 'right',
  open,
  onOpenChange,
  onCheckout,
  preferredTab,
  className,
}: {
  trigger?: React.ReactNode;
  side?: 'right' | 'left' | 'bottom' | 'popup';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCheckout: () => void;
  preferredTab?: 'cart' | 'chat';
  className?: string;
}) {
  const [activeTab, setActiveTab] = React.useState<'cart' | 'chat'>(preferredTab ?? 'cart');

  React.useEffect(() => {
    if (!open) return;
    setActiveTab(preferredTab ?? 'cart');
  }, [open, preferredTab]);

  return (
    <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        side={side}
        overlayClassName={
          side === 'popup'
            ? 'pointer-events-none bg-transparent backdrop-blur-none'
            : 'pointer-events-none bg-neutral-950/40 backdrop-blur-none'
        }
        className={cn(
          side === 'bottom' ? 'h-[85vh] rounded-t-2xl' : undefined,
          side === 'popup' ? 'shadow-xl' : 'w-full sm:max-w-md',
          side === 'popup' ? 'h-[min(640px,calc(100vh-2rem))]' : undefined,
          side === 'popup' ? undefined : 'p-4',
          'flex flex-col overflow-hidden',
          className
        )}
      >
        <SheetHeader className="space-y-0">
          <div className="flex items-center justify-between gap-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cart' | 'chat')}>
              <TabsList className="h-9">
                <TabsTrigger value="cart" className="text-sm">
                  Cart
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-sm">
                  Chat
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <SheetClose asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full text-lg leading-none"
                aria-label="Close cart"
              >
                X
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="mt-3 min-h-0 flex-1 overflow-hidden">
          {activeTab === 'chat' ? (
            <div className="flex h-full flex-col">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Get help finding a product or ask us any questions. We’re both your shopping assistant and support chat.
              </div>
              <div className="mt-3 min-h-0 flex-1">
                <ShopChatPanel className="h-full" />
              </div>
            </div>
          ) : (
            <CartPanel
              onCheckout={() => {
                onCheckout();
                onOpenChange?.(false);
              }}
              className="h-full border-0 bg-transparent p-0 shadow-none"
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
