/**
 * Edit-side payload helpers: seed the form from an existing product
 * (formFromProduct) and build the PUT body (buildUpdatePayload).
 *
 * The deployed backend replaces the whole product on PUT, so buildUpdatePayload
 * starts from the existing record to preserve fields this form doesn't manage
 * (variants, subscription, gallery images, Stripe sync metadata, compliance, …),
 * overlays only what the form owns, clears toggleable fields when off, and
 * normalises away alternate stored shapes that storefront/checkout readers would
 * otherwise prefer over the canonical flat fields the form writes.
 */

import { buildCreatePayload, buildStoreBillingPayload, defaultProduct } from './productPayload';
import type { FulfillmentType, NewProductForm } from './ProductAddFormTypes';
import type { Product, StorePolicyFulfillmentType } from './types';
import type { ProductImage } from '../../types/productVariations';
import { getProductImageUrl, type AdminProductType } from './productDisplay';

const STORE_POLICY_VALUES = new Set<string>([
  'digital_in_app',
  'physical_goods',
  'real_world_service',
  'reader_content',
  'other',
]);

/**
 * Alternate stored representations the storefront/checkout readers prefer over
 * the canonical flat fields this form writes. We strip them on save so an edit
 * actually takes effect instead of being masked by a stale shape.
 */
const STALE_PRODUCT_KEYS = ['price', 'fiatPrice', 'cryptoPrice', 'compareAtFiatPrice', 'compareAtPrice', 'imageUrls', 'displayName'];

function asRequirement(value: string | undefined, fallback: NewProductForm['checkoutEmail']) {
  return value === 'none' || value === 'optional' || value === 'required' ? value : fallback;
}

/** Read `{ amountCents }` from an alternate nested price shape (price/fiatPrice). */
function nestedAmountCents(value: unknown): number | null {
  if (value && typeof value === 'object' && 'amountCents' in value) {
    const cents = (value as { amountCents?: unknown }).amountCents;
    if (typeof cents === 'number') return cents;
  }
  return null;
}

/** First entry of a stored `imageUrls` string array, if present. */
function firstImageUrl(raw: Record<string, unknown>): string | null {
  const urls = raw.imageUrls;
  if (Array.isArray(urls)) {
    const first = urls.find((url) => typeof url === 'string' && url);
    if (typeof first === 'string') return first;
  }
  return null;
}

/**
 * Reverse of buildCreatePayload: seed the form from an existing product for
 * editing. Reads the alternate stored shapes (nested price, imageUrls) that the
 * storefront/checkout readers accept so a product never opens with a blank field.
 */
export function formFromProduct(product: Product): NewProductForm {
  const base = defaultProduct();
  const raw = product as unknown as Record<string, unknown>;
  const isShipping =
    (product.fulfillment?.type ?? (product.shippingProfile === 'physical' ? 'shipping' : 'digital_download')) === 'shipping';
  const fulfillmentType: FulfillmentType = isShipping
    ? 'shipping'
    : product.fulfillment?.type === 'service'
      ? 'service'
      : 'digital_download';
  const metadataPolicy = product.metadata?.store_policy_fulfillment_type;
  const billing = product.storeBilling ?? undefined;
  const countries = (product.metadata?.shippingCountries ?? '')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  return {
    ...base,
    id: product.id,
    slug: product.slug ?? '',
    title: product.title ?? '',
    imageUrl: getProductImageUrl(product) ?? firstImageUrl(raw) ?? '',
    description: product.description ?? '',
    seoTitle: product.seoTitle ?? '',
    seoDescription: product.seoDescription ?? '',
    productType: (product.metadata?.product_type as AdminProductType) ?? 'one_time',
    priceCents: product.fiatAmountCents ?? nestedAmountCents(raw.price) ?? nestedAmountCents(raw.fiatPrice) ?? null,
    compareAtCents: product.compareAtFiatAmountCents ?? nestedAmountCents(raw.compareAtFiatPrice) ?? null,
    fiatCurrency: product.fiatCurrency ?? base.fiatCurrency,
    cryptoToken: product.cryptoToken ?? base.cryptoToken,
    // Inventory is a physical-only concern; don't surface it for other delivery types.
    trackInventory: isShipping && product.inventoryQuantity != null,
    inventoryQuantity: isShipping ? product.inventoryQuantity ?? null : null,
    tags: product.tags ?? [],
    categoryIds: product.categoryIds ?? [],
    checkoutEmail: asRequirement(product.checkoutRequirements?.email, base.checkoutEmail),
    checkoutName: asRequirement(product.checkoutRequirements?.name, base.checkoutName),
    checkoutPhone: asRequirement(product.checkoutRequirements?.phone, base.checkoutPhone),
    checkoutShippingAddress: isShipping ? true : product.checkoutRequirements?.shippingAddress ?? false,
    checkoutBillingAddress: product.checkoutRequirements?.billingAddress ?? false,
    shippingCountries: countries,
    fulfillmentType,
    storePolicyFulfillment:
      (metadataPolicy && STORE_POLICY_VALUES.has(metadataPolicy)
        ? (metadataPolicy as StorePolicyFulfillmentType)
        : undefined) ??
      (fulfillmentType === 'shipping'
        ? 'physical_goods'
        : fulfillmentType === 'service'
          ? 'real_world_service'
          : 'digital_in_app'),
    sellInApp: Boolean(billing?.kind),
    storeManagedKind: billing?.kind ?? 'none',
    appleProductId: billing?.apple?.productId ?? '',
    googleProductId: billing?.google?.productId ?? '',
    googlePackageName: billing?.google?.packageName ?? '',
    googleBasePlanId: billing?.google?.basePlanId ?? '',
    googleOfferId: billing?.google?.offerId ?? '',
    fulfillmentNotes: product.fulfillment?.notes ?? '',
    active: product.active ?? true,
  };
}

export function buildUpdatePayload(form: NewProductForm, existing: Product): Record<string, unknown> {
  const owned = buildCreatePayload(form);
  const isShipping = form.fulfillmentType === 'shipping';
  const tracking = isShipping && form.trackInventory && form.inventoryQuantity != null;
  const storeBilling = buildStoreBillingPayload(form);
  const payload: Record<string, unknown> = {
    ...(existing as unknown as Record<string, unknown>),
    ...owned,
    id: existing.id,
    title: form.title.trim() || null,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    compareAtFiatAmountCents: form.compareAtCents ?? null,
    compareAtFiatCurrency: form.compareAtCents != null ? form.fiatCurrency : null,
    storeBilling: storeBilling ?? null,
    images: mergeImages(existing, form.imageUrl, form.title.trim() || existing.id),
    active: form.active,
    metadata: mergeUpdatedMetadata(existing.metadata, form),
    // Inventory is physical-only: clear it for a shipped-but-untracked item;
    // leave it untouched (via the existing spread) for non-physical products.
    ...(isShipping && !tracking ? { inventoryStatus: null, inventoryQuantity: null } : {}),
  };
  for (const key of STALE_PRODUCT_KEYS) delete payload[key];
  return payload;
}

/**
 * Replace the primary image while keeping the rest of the gallery, reading the
 * existing gallery from either `images[]` or the legacy `imageUrls` string array.
 */
function mergeImages(existing: Product, url: string, alt: string): ProductImage[] {
  const raw = existing as unknown as Record<string, unknown>;
  const fromImages = (existing.images ?? []).map((image) => ({ url: image.url, alt: image.alt }));
  const fromUrls = Array.isArray(raw.imageUrls)
    ? (raw.imageUrls as unknown[]).filter((u): u is string => typeof u === 'string').map((u) => ({ url: u }))
    : [];
  const rest = (fromImages.length ? fromImages : fromUrls).slice(1);
  return url ? [{ url, alt }, ...rest] : rest;
}

/** Merge the form-owned metadata keys over the existing map, preserving the rest. */
function mergeUpdatedMetadata(
  existing: Record<string, string> | undefined,
  form: NewProductForm
): Record<string, string> {
  const metadata: Record<string, string> = {
    ...(existing ?? {}),
    product_type: form.productType,
    store_policy_fulfillment_type: form.storePolicyFulfillment,
  };
  // The image now lives in images[]; drop the legacy mirror so it can't resurface.
  delete metadata.image_url;
  if (form.fulfillmentType === 'shipping' && form.shippingCountries.length) {
    metadata.shippingCountries = form.shippingCountries.map((c) => c.toUpperCase()).join(',');
  } else {
    delete metadata.shippingCountries;
  }
  return metadata;
}
