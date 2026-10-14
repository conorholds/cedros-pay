import { formatMinorCurrencyAmount } from '../../i18n/formatting';
import type { Product, StoreManagedProductKind, StorePolicyFulfillmentType } from './types';

export type AdminProductType = 'one_time' | 'pay_per_access' | 'subscription';
export type ProductSortKey = 'id' | 'product' | 'type' | 'price' | 'status';

export function getProductTitle(product: Product): string {
  return product.title || product.description || product.id;
}

export function getProductImageUrl(product: Product): string | undefined {
  return product.imageUrl || product.images?.[0]?.url || product.metadata?.image_url;
}

/** Money always goes through the locale formatter, never a hand-built string. */
export function formatPrice(cents?: number | null, locale?: string): string {
  return typeof cents === 'number'
    ? formatMinorCurrencyAmount(cents, 'USD', locale)
    : 'No fiat price';
}

export function formatProductType(value?: string): string {
  switch (value) {
    case 'subscription':
      return 'Subscription';
    case 'pay_per_access':
      return 'Pay per access';
    case 'one_time':
      return 'One-time purchase';
    default:
      return 'One-time purchase';
  }
}

function getStorePolicyFulfillment(
  product: Product
): StorePolicyFulfillmentType | undefined {
  const value = product.metadata?.store_policy_fulfillment_type;
  if (
    value === 'digital_in_app' ||
    value === 'physical_goods' ||
    value === 'real_world_service' ||
    value === 'reader_content' ||
    value === 'other'
  ) {
    return value;
  }

  switch (product.fulfillment?.type) {
    case 'shipping':
      return 'physical_goods';
    case 'service':
      return 'real_world_service';
    case 'digital_download':
      return 'digital_in_app';
    default:
      return undefined;
  }
}

function formatStorePolicyFulfillment(value?: StorePolicyFulfillmentType): string {
  switch (value) {
    case 'digital_in_app':
      return 'Digital in-app';
    case 'physical_goods':
      return 'Physical goods';
    case 'real_world_service':
      return 'Real-world service';
    case 'reader_content':
      return 'Reader content';
    case 'other':
      return 'Other';
    default:
      return 'Not set';
  }
}

function formatStoreManagedKind(value?: StoreManagedProductKind): string {
  switch (value) {
    case 'consumable':
      return 'Consumable';
    case 'non_consumable':
      return 'Non-consumable';
    case 'auto_renewable_subscription':
      return 'Auto-renewing subscription';
    default:
      return 'External billing only';
  }
}

export function getStoreSetupSummary(product: Product): string {
  const parts: string[] = [];
  const policyType = getStorePolicyFulfillment(product);
  if (policyType) {
    parts.push(formatStorePolicyFulfillment(policyType));
  }
  if (product.storeBilling?.kind) {
    parts.push(formatStoreManagedKind(product.storeBilling.kind));
  }
  if (product.storeBilling?.apple?.productId) {
    parts.push(`Apple ${product.storeBilling.apple.productId}`);
  }
  if (product.storeBilling?.google?.productId) {
    parts.push(`Google ${product.storeBilling.google.productId}`);
  }
  return parts.join(' - ');
}

export function productMatchesFilters(
  product: Product,
  query: string,
  statusFilter: 'all' | 'active' | 'inactive',
  typeFilter: 'all' | AdminProductType
): boolean {
  if (statusFilter === 'active' && !product.active) return false;
  if (statusFilter === 'inactive' && product.active) return false;
  if (typeFilter !== 'all' && (product.metadata?.product_type ?? 'one_time') !== typeFilter) {
    return false;
  }
  if (!query) return true;

  const haystack = [
    product.id,
    getProductTitle(product),
    product.description,
    formatProductType(product.metadata?.product_type),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}
