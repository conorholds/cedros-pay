import type { CouponScope } from './types';

interface CouponCheckoutOptions {
  usageLimit?: number;
  usageLimitPerCustomer?: number;
  firstPurchaseOnly: boolean;
  scope: CouponScope;
}

/**
 * Coupon options the checkout backend rejects until durable redemption
 * accounting and line-item scope evaluation ship. Buyers receive an explicit
 * error instead of a silent full-price charge, so warn operators up front.
 */
function unsupportedCheckoutOptions(coupon: CouponCheckoutOptions): string[] {
  const options: string[] = [];
  if (coupon.usageLimit) options.push('usage limits');
  if (coupon.usageLimitPerCustomer) options.push('per-customer limits');
  if (coupon.firstPurchaseOnly) options.push('first-purchase-only');
  if (coupon.scope !== 'all_products') options.push('product/category restrictions');
  return options;
}

export function UnsupportedCheckoutOptionsNotice({ coupon }: { coupon: CouponCheckoutOptions }) {
  const options = unsupportedCheckoutOptions(coupon);
  if (options.length === 0) return null;
  return (
    <div className="cedros-data-status cedros-data-status--warning cedros-admin__error-banner" role="status">
      <span>
        Not yet applied at checkout: {options.join(', ')}. Codes using these options are
        rejected at checkout with a clear error until support ships.
      </span>
    </div>
  );
}
