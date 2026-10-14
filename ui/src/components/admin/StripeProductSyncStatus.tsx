import type { Product } from './types';

const SYNC_STATUS_KEY = 'cedros_stripe_sync_status';
const SYNCED_AT_KEY = 'cedros_stripe_synced_at';
const SYNC_ERROR_KEY = 'cedros_stripe_sync_error';

export function StripeProductSyncStatus({ product }: { product: Product }) {
  const status = product.metadata?.[SYNC_STATUS_KEY];
  const syncedAt = product.metadata?.[SYNCED_AT_KEY];
  const syncError = product.metadata?.[SYNC_ERROR_KEY];

  if (status === 'error') {
    return (
      <span className="cedros-admin__product-sync cedros-admin__product-sync--error">
        Stripe: sync error{syncError ? ` - ${syncError}` : ''}
      </span>
    );
  }

  if (!product.stripeProductId) {
    return (
      <span className="cedros-admin__product-sync cedros-admin__product-sync--muted">
        Stripe: not linked
      </span>
    );
  }

  const parts = ['Stripe: linked'];
  if (product.stripePriceId) {
    parts.push(product.stripePriceId);
  }
  if (syncedAt) {
    parts.push(`synced ${formatDateTime(syncedAt)}`);
  }

  return (
    <span className="cedros-admin__product-sync cedros-admin__product-sync--muted">
      {parts.join(' • ')}
    </span>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
