import * as React from 'react';
import { useCedrosShop } from '../config/context';
import { useSubscriptionData } from '../hooks/useSubscriptionData';
import { cn } from '../utils/cn';
import { formatMoney } from '../utils/money';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/general/EmptyState';
import { ErrorState } from '../components/general/ErrorState';
import { Skeleton } from '../components/ui/skeleton';

// Checkmark icon component
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4 flex-shrink-0', className)}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export interface SubscriptionTemplateProps {
  className?: string;
  /** Page title */
  title?: string;
  /** Subtitle shown below title */
  subtitle?: string;
  /** Text for annual savings badge (e.g., "2 months free") */
  annualSavingsBadge?: string;
  /** Badge text for popular plan (default: "Best Deal") */
  popularBadgeText?: string;
  /** Footer notice text */
  footerNotice?: string;
}

export function SubscriptionTemplate({
  className,
  title = 'Choose Your Plan',
  subtitle = 'Select the plan that best fits your needs.',
  annualSavingsBadge = '2 months free',
  popularBadgeText = 'Best Deal',
  footerNotice,
}: SubscriptionTemplateProps) {
  const { config } = useCedrosShop();
  const { tiers, status, isLoading, error } = useSubscriptionData();
  const [interval, setInterval] = React.useState<'monthly' | 'annual'>('monthly');

  const canCheckout = Boolean(config.adapter.createSubscriptionCheckoutSession);

  const startCheckout = async (tierId: string) => {
    if (!config.adapter.createSubscriptionCheckoutSession) return;
    const res = await config.adapter.createSubscriptionCheckoutSession({
      tierId,
      interval,
      successUrl: config.checkout.successUrl,
      cancelUrl: config.checkout.cancelUrl,
    });
    if (res.kind === 'redirect' && typeof window !== 'undefined') {
      window.location.assign(res.url);
    }
  };

  return (
    <div className={cn('min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50', className)}>
      <main className="mx-auto max-w-6xl px-4 py-16">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight">{title}</h1>
          <p className="mt-4 text-base text-neutral-600 dark:text-neutral-400">
            {subtitle}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center rounded-full bg-neutral-200/60 p-1 dark:bg-neutral-800/60">
            <button
              type="button"
              onClick={() => setInterval('annual')}
              className={cn(
                'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                interval === 'annual'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              )}
            >
              Yearly
              {annualSavingsBadge && (
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  interval === 'annual'
                    ? 'bg-white/20 text-white dark:bg-neutral-900/20 dark:text-neutral-900'
                    : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                )}>
                  {annualSavingsBadge}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setInterval('monthly')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                interval === 'monthly'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              )}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Error State */}
        {error ? <ErrorState className="mt-10" description={error} /> : null}

        {/* Loading State */}
        {isLoading ? (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Skeleton className="h-[480px] rounded-2xl" />
            <Skeleton className="h-[480px] rounded-2xl" />
            <Skeleton className="h-[480px] rounded-2xl" />
          </div>
        ) : tiers.length === 0 ? (
          <div className="mt-12">
            <EmptyState title="No plans available" description="Subscription plans will appear here once configured." />
          </div>
        ) : (
          /* Pricing Cards */
          <div className="mt-12 grid gap-6 md:grid-cols-3 items-start">
            {tiers.map((tier) => {
              const isCurrent = status?.isActive && status.currentTierId === tier.id;
              const price = interval === 'annual' && tier.priceAnnual ? tier.priceAnnual : tier.priceMonthly;
              const isPopular = tier.isPopular;

              // Inventory tracking
              const hasInventoryLimit = tier.inventoryQuantity != null;
              const inventoryRemaining = hasInventoryLimit
                ? Math.max(0, (tier.inventoryQuantity ?? 0) - (tier.inventorySold ?? 0))
                : null;
              const isSoldOut = hasInventoryLimit && inventoryRemaining === 0;
              const isLowStock = hasInventoryLimit && inventoryRemaining != null && inventoryRemaining > 0 && inventoryRemaining <= 5;

              // Split features: first one is highlight, rest are regular
              const [highlightFeature, ...regularFeatures] = tier.features;

              return (
                <div
                  key={tier.id}
                  className={cn(
                    'relative flex flex-col rounded-2xl border p-6 transition-shadow',
                    isPopular
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xl dark:border-white dark:bg-white dark:text-neutral-900'
                      : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                  )}
                >
                  {/* Popular Badge */}
                  {isPopular && popularBadgeText && (
                    <div className="absolute -top-3 right-4">
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white">
                        {popularBadgeText}
                      </span>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold">{tier.title}</h3>
                    {tier.description && (
                      <p className={cn(
                        'mt-2 text-sm leading-relaxed',
                        isPopular
                          ? 'text-neutral-300 dark:text-neutral-600'
                          : 'text-neutral-600 dark:text-neutral-400'
                      )}>
                        {tier.description}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="text-5xl font-bold tracking-tight">
                      {formatMoney({ amount: price, currency: tier.currency || config.currency })}
                    </div>
                    <div className={cn(
                      'mt-2 text-sm',
                      isPopular
                        ? 'text-neutral-400 dark:text-neutral-500'
                        : 'text-neutral-500 dark:text-neutral-400'
                    )}>
                      Per {interval === 'annual' ? 'year' : 'month'}, billed {interval === 'annual' ? 'annually' : 'monthly'}
                    </div>
                  </div>

                  {/* Inventory Status */}
                  {hasInventoryLimit && (
                    <div className={cn(
                      'mb-3 text-xs font-medium',
                      isSoldOut
                        ? 'text-red-600 dark:text-red-400'
                        : isLowStock
                          ? (isPopular ? 'text-amber-300 dark:text-amber-600' : 'text-amber-600 dark:text-amber-400')
                          : (isPopular ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-500 dark:text-neutral-400')
                    )}>
                      {isSoldOut
                        ? 'Sold out'
                        : `${inventoryRemaining} remaining`}
                    </div>
                  )}

                  {/* CTA Button */}
                  <Button
                    type="button"
                    className={cn(
                      'mb-6 w-full rounded-full py-3 font-medium',
                      isPopular
                        ? 'bg-white text-neutral-900 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800'
                        : ''
                    )}
                    variant={isPopular ? 'default' : 'outline'}
                    disabled={isCurrent || !canCheckout || isSoldOut}
                    onClick={() => void startCheckout(tier.id)}
                  >
                    {isSoldOut ? 'Sold Out' : isCurrent ? 'Current Plan' : 'Purchase'}
                  </Button>

                  {/* Feature Highlight */}
                  {highlightFeature && (
                    <div className={cn(
                      'mb-4 text-sm font-semibold',
                      isPopular ? '' : 'text-neutral-900 dark:text-white'
                    )}>
                      {highlightFeature}
                    </div>
                  )}

                  {/* Features List */}
                  {regularFeatures.length > 0 && (
                    <ul className="space-y-3">
                      {regularFeatures.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckIcon className={cn(
                            'mt-0.5',
                            isPopular
                              ? 'text-neutral-400 dark:text-neutral-500'
                              : 'text-neutral-500 dark:text-neutral-400'
                          )} />
                          <span className={cn(
                            'text-sm leading-relaxed',
                            isPopular
                              ? 'text-neutral-300 dark:text-neutral-600'
                              : 'text-neutral-600 dark:text-neutral-400'
                          )}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Notice */}
        {footerNotice && (
          <div className="mt-12 text-center">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-2xl mx-auto">
              {footerNotice}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
