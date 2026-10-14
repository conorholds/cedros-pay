/**
 * Pure helpers for the Add product page: sensible defaults, the small reducers
 * that keep linked fields (name → id, delivery → store policy) in sync, input
 * validation, and the create payload builder. No React here — keeps the page
 * and section components thin and unit-testable.
 */

import type { FulfillmentType, NewProductForm } from './ProductAddFormTypes';
import type { StoreBillingConfig, StorePolicyFulfillmentType } from './types';
import type { AdminProductType } from './productDisplay';

/** Micro-units of USDC per fiat cent (USDC has 6 decimals; 1 cent = 0.01 USD). */
const USDC_MICRO_PER_CENT = 10_000;

/** Store-policy classifications that apply to digital goods (kept across delivery re-picks). */
const DIGITAL_POLICIES = new Set<StorePolicyFulfillmentType>([
  'digital_in_app',
  'reader_content',
  'other',
]);

export function defaultProduct(): NewProductForm {
  return {
    id: '',
    slug: '',
    title: '',
    imageUrl: '',
    description: '',
    seoTitle: '',
    seoDescription: '',
    productType: 'one_time',
    priceCents: null,
    compareAtCents: null,
    fiatCurrency: 'usd',
    cryptoToken: 'USDC',
    trackInventory: false,
    inventoryQuantity: null,
    tags: [],
    categoryIds: [],
    checkoutEmail: 'required',
    checkoutName: 'optional',
    checkoutPhone: 'none',
    checkoutShippingAddress: false,
    checkoutBillingAddress: false,
    shippingCountries: [],
    fulfillmentType: 'digital_download',
    storePolicyFulfillment: 'digital_in_app',
    sellInApp: false,
    storeManagedKind: 'none',
    appleProductId: '',
    googleProductId: '',
    googlePackageName: '',
    googleBasePlanId: '',
    googleOfferId: '',
    fulfillmentNotes: '',
    active: true,
  };
}

/** Turn a display name into a stable, URL-safe id: "Cedros Hoodie" → "cedros-hoodie". */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Update the name and, unless the id has been hand-edited, keep the id in sync. */
export function applyTitle(form: NewProductForm, title: string, idLocked: boolean): NewProductForm {
  const generated = slugify(title);
  const slugTracksTitle = !form.slug || form.slug === slugify(form.title);
  return {
    ...form,
    title,
    id: idLocked ? form.id : generated,
    slug: slugTracksTitle ? generated : form.slug,
  };
}

/**
 * Apply a delivery-method change. Store-policy classification (used by the host
 * to route payments across web / App Store / Google Play) is derived from the
 * delivery method, and in-app purchases only apply to digital goods, so picking
 * a physical or service item turns them off.
 */
export function applyFulfillment(form: NewProductForm, fulfillmentType: FulfillmentType): NewProductForm {
  const isDigital = fulfillmentType === 'digital_download';
  const isShipping = fulfillmentType === 'shipping';
  return {
    ...form,
    fulfillmentType,
    storePolicyFulfillment: isShipping
      ? 'physical_goods'
      : fulfillmentType === 'service'
        ? 'real_world_service'
        : DIGITAL_POLICIES.has(form.storePolicyFulfillment)
          ? form.storePolicyFulfillment
          : 'digital_in_app',
    sellInApp: isDigital ? form.sellInApp : false,
    storeManagedKind: isDigital ? form.storeManagedKind : 'none',
    trackInventory: isShipping ? form.trackInventory : false,
    // Physical goods need an address to ship to, so default it on (toggle off
    // for pickup); anything else never collects one.
    checkoutShippingAddress: isShipping,
  };
}

/** Subscriptions map to an auto-renewing store product; switching away undoes that. */
export function applyProductType(form: NewProductForm, productType: AdminProductType): NewProductForm {
  if (!form.sellInApp) return { ...form, productType };
  return {
    ...form,
    productType,
    storeManagedKind:
      productType === 'subscription'
        ? 'auto_renewable_subscription'
        : form.storeManagedKind === 'auto_renewable_subscription'
          ? 'non_consumable'
          : form.storeManagedKind,
  };
}

/** Toggle in-app purchases, seeding a sensible store product kind when turning on. */
export function applySellInApp(form: NewProductForm, sellInApp: boolean): NewProductForm {
  return {
    ...form,
    sellInApp,
    storeManagedKind: !sellInApp
      ? 'none'
      : form.productType === 'subscription'
        ? 'auto_renewable_subscription'
        : form.storeManagedKind === 'none'
          ? 'non_consumable'
          : form.storeManagedKind,
  };
}

/** First blocking problem with the form, as a user-facing sentence, or null. */
export function validateProduct(form: NewProductForm): string | null {
  if (!form.title.trim()) return 'Add a product name.';
  if (!form.id.trim()) return 'Add a product ID under Advanced — the name had no usable characters.';
  if (!form.slug.trim()) return 'Add a storefront URL slug under Advanced.';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim()) || form.slug.trim().length > 120) {
    return 'Use 1–120 lowercase letters, numbers, and single dashes for the storefront URL slug.';
  }
  if (!form.description.trim()) return 'Add a short description.';
  if (form.priceCents == null) return 'Set a price.';
  if (form.fulfillmentType === 'shipping' && form.shippingCountries.length === 0) {
    return 'Add at least one country you ship to.';
  }
  if (form.sellInApp && !form.appleProductId.trim() && !form.googleProductId.trim()) {
    return 'Add an App Store or Google Play product ID, or turn off in-app purchases.';
  }
  if (form.googleBasePlanId.trim() && !form.googleProductId.trim()) {
    return 'A Google base plan ID needs a Google Play product ID.';
  }
  if (form.sellInApp && form.storeManagedKind === 'auto_renewable_subscription' && form.googleProductId.trim() && !form.googleBasePlanId.trim()) {
    return 'Google Play subscriptions need a base plan ID.';
  }
  return null;
}

export function buildCreatePayload(form: NewProductForm): Record<string, unknown> {
  const priceCents = form.priceCents ?? 0;
  const isShipping = form.fulfillmentType === 'shipping';
  const storeBilling = buildStoreBillingPayload(form);
  return {
    id: form.id.trim(),
    slug: form.slug.trim(),
    title: form.title.trim() || undefined,
    seoTitle: form.seoTitle.trim() || undefined,
    seoDescription: form.seoDescription.trim() || undefined,
    description: form.description.trim(),
    tags: form.tags,
    categoryIds: form.categoryIds,
    images: form.imageUrl ? [{ url: form.imageUrl, alt: form.title.trim() || form.id }] : [],
    shippingProfile: isShipping ? 'physical' : 'digital',
    checkoutRequirements: {
      email: form.checkoutEmail,
      name: form.checkoutName,
      phone: form.checkoutPhone,
      shippingAddress: form.checkoutShippingAddress,
      billingAddress: form.checkoutBillingAddress,
    },
    fulfillment: { type: form.fulfillmentType, notes: form.fulfillmentNotes.trim() || undefined },
    fiatAmountCents: priceCents,
    fiatCurrency: form.fiatCurrency,
    compareAtFiatAmountCents: form.compareAtCents ?? undefined,
    compareAtFiatCurrency: form.compareAtCents != null ? form.fiatCurrency : undefined,
    cryptoAtomicAmount: priceCents * USDC_MICRO_PER_CENT,
    cryptoToken: form.cryptoToken,
    // Track inventory only sends a count when one was entered; a blank count
    // leaves the product untracked (unlimited) rather than silently set to 0.
    // Status follows the count so we never report "in stock" with 0 on hand.
    ...(isShipping && form.trackInventory && form.inventoryQuantity != null
      ? {
          inventoryStatus: form.inventoryQuantity > 0 ? 'in_stock' : 'out_of_stock',
          inventoryQuantity: form.inventoryQuantity,
        }
      : {}),
    ...(storeBilling ? { storeBilling } : {}),
    active: form.active,
    metadata: buildCatalogMetadata(form),
  };
}

function buildCatalogMetadata(form: NewProductForm): Record<string, string> {
  const metadata: Record<string, string> = {
    product_type: form.productType,
    store_policy_fulfillment_type: form.storePolicyFulfillment,
  };
  // Physical products are always shippable on the backend, so countries are
  // keyed on delivery type — not the (now implicit) address toggle.
  if (form.fulfillmentType === 'shipping' && form.shippingCountries.length) {
    metadata.shippingCountries = form.shippingCountries.map((c) => c.toUpperCase()).join(',');
  }
  return metadata;
}

export function buildStoreBillingPayload(form: NewProductForm): StoreBillingConfig | undefined {
  if (!form.sellInApp || form.storeManagedKind === 'none') return undefined;
  const appleProductId = form.appleProductId.trim();
  const googleProductId = form.googleProductId.trim();
  if (!appleProductId && !googleProductId) return undefined;
  return {
    kind: form.storeManagedKind,
    apple: appleProductId ? { productId: appleProductId } : undefined,
    google: googleProductId
      ? {
          productId: googleProductId,
          packageName: form.googlePackageName.trim() || undefined,
          basePlanId: form.googleBasePlanId.trim() || undefined,
          offerId: form.googleOfferId.trim() || undefined,
        }
      : undefined,
  };
}
