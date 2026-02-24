import { useCedrosShop } from '../../config/context';
import { useCart } from '../../state/cart/CartProvider';
import { useCheckout } from '../../state/checkout/useCheckout';
import { useStorefrontSettings } from '../../hooks/useStorefrontSettings';
import { cn } from '../../utils/cn';
import { formatMoney } from '../../utils/money';
import { Separator } from '../ui/separator';
import { PromoCodeInput } from '../cart/PromoCodeInput';

export function OrderReview({ className }: { className?: string }) {
  const { config } = useCedrosShop();
  const cart = useCart();
  const checkout = useCheckout();
  const { settings: storefrontSettings } = useStorefrontSettings();

  // Show promo codes only if both code-level config AND storefront settings allow it
  const showPromoCodes = (config.checkout.allowPromoCodes ?? false) && storefrontSettings.checkout.promoCodes;

  return (
    <div
      className={cn(
        'rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950',
        className
      )}
    >
      <div className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Order review</div>
      <Separator className="my-3" />
      <div className="space-y-3">
        {cart.items.map((it) => (
          <div key={`${it.productId}::${it.variantId ?? ''}`} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
                {it.imageSnapshot ? (
                  <img src={it.imageSnapshot} alt={it.titleSnapshot} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="line-clamp-1 text-sm text-neutral-950 dark:text-neutral-50">{it.titleSnapshot}</div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400">Qty {it.qty}</div>
              </div>
            </div>
            <div className="text-sm font-semibold tabular-nums text-neutral-950 dark:text-neutral-50">
              {formatMoney({ amount: it.unitPrice * it.qty, currency: it.currency })}
            </div>
          </div>
        ))}
      </div>
      <Separator className="my-3" />

      {showPromoCodes ? (
        <PromoCodeInput
          value={checkout.values.discountCode ?? cart.promoCode}
          onApply={(code) => {
            checkout.setField('discountCode', code ?? '');
            cart.setPromoCode(code);
          }}
        />
      ) : null}

      {showPromoCodes ? <Separator className="my-3" /> : null}
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">Subtotal</span>
        <span className="font-semibold text-neutral-950 dark:text-neutral-50">
          {formatMoney({ amount: cart.subtotal, currency: config.currency })}
        </span>
      </div>
    </div>
  );
}
