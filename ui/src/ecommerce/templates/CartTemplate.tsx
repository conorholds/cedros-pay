import { useCedrosShop } from '../config/context';
import { cn } from '../utils/cn';
import { CartPageContent } from '../components/cart/CartPageContent';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';

export function CartTemplate({
  className,
  checkoutHref,
}: {
  className?: string;
  checkoutHref?: string;
}) {
  const { config } = useCedrosShop();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const href = checkoutHref ?? '/checkout';

  // Show promo codes only if both code-level config AND storefront settings allow it
  const showPromoCodes = config.checkout.allowPromoCodes && storefrontSettings.checkout.promoCodes;

  return (
    <div className={cn('min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50', className)}>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Cart</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Review items, adjust quantities, then check out.
        </p>
        <div className="mt-8">
          <CartPageContent
            onCheckout={() => {
              if (typeof window !== 'undefined') window.location.assign(href);
            }}
            showPromoCode={showPromoCodes}
          />
        </div>
      </main>
    </div>
  );
}
