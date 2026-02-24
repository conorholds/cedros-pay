import { useCedrosShop } from '../../config/context';
import { useCart } from '../../state/cart/CartProvider';
import { useCartInventory } from '../../hooks/useCartInventory';
import { cn } from '../../utils/cn';
import { EmptyState } from '../general/EmptyState';
import { CartLineItem } from './CartLineItem';
import { CartSummary } from './CartSummary';
import { PromoCodeInput } from './PromoCodeInput';
import { Separator } from '../ui/separator';

export function CartPageContent({
  onCheckout,
  showPromoCode,
  className,
}: {
  onCheckout: () => void;
  showPromoCode?: boolean;
  className?: string;
}) {
  const { config } = useCedrosShop();
  const cart = useCart();
  const { getItemInventory, hasIssues } = useCartInventory({
    items: cart.items,
    refreshInterval: 30000,
    skip: cart.items.length === 0,
  });

  // Handler to remove all unavailable items (out of stock or exceeds available)
  const handleRemoveUnavailable = () => {
    for (const item of cart.items) {
      const inv = getItemInventory(item.productId, item.variantId);
      if (inv?.isOutOfStock || inv?.exceedsAvailable) {
        cart.removeItem(item.productId, item.variantId);
      }
    }
  };

  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add a few products and come back here when you're ready to check out."
        className={className}
      />
    );
  }

  return (
    <div className={cn('grid items-start gap-6 lg:grid-cols-[1fr_360px]', className)}>
      <div className="self-start rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="hidden grid-cols-[64px_1fr_176px_120px] gap-x-4 px-5 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 sm:grid">
          <div />
          <div>Item</div>
          <div className="text-center">Qty</div>
          <div className="text-center">Total</div>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {cart.items.map((it) => (
            <div key={`${it.productId}::${it.variantId ?? ''}`} className="px-4 py-4 sm:px-5">
              <CartLineItem
                item={it}
                onRemove={() => cart.removeItem(it.productId, it.variantId)}
                onSetQty={(qty) => cart.setQty(it.productId, it.variantId, qty)}
                inventory={getItemInventory(it.productId, it.variantId)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="lg:sticky lg:top-24 self-start">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Summary</div>
          <Separator className="my-4" />
          <div className="space-y-4">
            {showPromoCode ? <PromoCodeInput value={cart.promoCode} onApply={cart.setPromoCode} /> : null}
            <CartSummary
              currency={config.currency}
              subtotal={cart.subtotal}
              onCheckout={onCheckout}
              isCheckoutDisabled={cart.items.length === 0 || hasIssues}
              checkoutDisabledReason={hasIssues ? 'Some items have inventory issues' : undefined}
              onRemoveUnavailable={hasIssues ? handleRemoveUnavailable : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
