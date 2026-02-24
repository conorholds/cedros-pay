import { useCedrosShop } from '../../config/context';
import { useCart } from '../../state/cart/CartProvider';
import { useCartInventory } from '../../hooks/useCartInventory';
import { cn } from '../../utils/cn';
import { EmptyState } from '../general/EmptyState';
import { CartLineItem } from './CartLineItem';
import { CartSummary } from './CartSummary';

export function CartPanel({
  onCheckout,
  className,
}: {
  onCheckout: () => void;
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
        title="Cart is empty"
        description="Add items from the catalog to check out."
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950',
        className
      )}
    >
      <div className="-mr-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-4">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {cart.items.map((it) => (
            <div key={`${it.productId}::${it.variantId ?? ''}`} className="py-3">
              <CartLineItem
                variant="compact"
                item={it}
                onRemove={() => cart.removeItem(it.productId, it.variantId)}
                onSetQty={(qty) => cart.setQty(it.productId, it.variantId, qty)}
                inventory={getItemInventory(it.productId, it.variantId)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <CartSummary
          currency={config.currency}
          subtotal={cart.subtotal}
          itemCount={cart.count}
          onCheckout={onCheckout}
          isCheckoutDisabled={cart.items.length === 0 || hasIssues}
          checkoutDisabledReason={hasIssues ? 'Some items have inventory issues' : undefined}
          onRemoveUnavailable={hasIssues ? handleRemoveUnavailable : undefined}
        />
      </div>
    </div>
  );
}
