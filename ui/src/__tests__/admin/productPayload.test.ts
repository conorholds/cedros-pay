import { describe, expect, it } from 'vitest';

import {
  applyFulfillment,
  applyTitle,
  buildCreatePayload,
  defaultProduct,
  validateProduct,
} from '../../components/admin/productPayload';
import { buildUpdatePayload, formFromProduct } from '../../components/admin/productEditPayload';
import { countryName, resolveCountry } from '../../components/admin/countries';
import type { NewProductForm } from '../../components/admin/ProductAddFormTypes';
import type { Product } from '../../components/admin/types';

function physical(overrides: Partial<NewProductForm> = {}): NewProductForm {
  return {
    ...defaultProduct(),
    title: 'Hoodie',
    id: 'hoodie',
    slug: 'hoodie',
    description: 'A hoodie',
    priceCents: 5000,
    fulfillmentType: 'shipping',
    ...overrides,
  };
}

describe('buildCreatePayload inventory', () => {
  it('sends inventoryStatus in_stock with the quantity when tracking a positive count', () => {
    const payload = buildCreatePayload(physical({ trackInventory: true, inventoryQuantity: 12 }));
    expect(payload.inventoryStatus).toBe('in_stock');
    expect(payload.inventoryQuantity).toBe(12);
  });

  it('reports a tracked count of 0 as out_of_stock, never in_stock', () => {
    const payload = buildCreatePayload(physical({ trackInventory: true, inventoryQuantity: 0 }));
    expect(payload.inventoryStatus).toBe('out_of_stock');
    expect(payload.inventoryQuantity).toBe(0);
  });

  it('omits inventory entirely when tracking is on but no count was entered (untracked)', () => {
    const payload = buildCreatePayload(physical({ trackInventory: true, inventoryQuantity: null }));
    expect(payload).not.toHaveProperty('inventoryStatus');
    expect(payload).not.toHaveProperty('inventoryQuantity');
  });

  it('omits inventory for non-physical products', () => {
    const payload = buildCreatePayload(
      physical({ fulfillmentType: 'digital_download', trackInventory: true, inventoryQuantity: 5 })
    );
    expect(payload).not.toHaveProperty('inventoryQuantity');
  });
});

describe('buildCreatePayload organization', () => {
  it('passes through category IDs and tags', () => {
    const payload = buildCreatePayload(
      physical({ tags: ['apparel'], categoryIds: ['cat_apparel', 'cat_new'] })
    );
    expect(payload.tags).toEqual(['apparel']);
    expect(payload.categoryIds).toEqual(['cat_apparel', 'cat_new']);
  });

  it('upper-cases shipping countries for physical products and omits them otherwise', () => {
    const physicalPayload = buildCreatePayload(physical({ shippingCountries: ['us', 'ca'] }));
    expect((physicalPayload.metadata as Record<string, string>).shippingCountries).toBe('US,CA');

    const digitalPayload = buildCreatePayload(
      physical({ fulfillmentType: 'digital_download', shippingCountries: ['us'] })
    );
    expect(digitalPayload.metadata as Record<string, string>).not.toHaveProperty('shippingCountries');
  });
});

describe('applyFulfillment', () => {
  it('keeps a chosen digital classification when delivery stays digital', () => {
    const form = applyFulfillment(
      { ...defaultProduct(), storePolicyFulfillment: 'reader_content' },
      'digital_download'
    );
    expect(form.storePolicyFulfillment).toBe('reader_content');
  });

  it('derives the classification and disables in-app billing for physical goods', () => {
    const form = applyFulfillment(
      { ...defaultProduct(), sellInApp: true, storeManagedKind: 'non_consumable' },
      'shipping'
    );
    expect(form.storePolicyFulfillment).toBe('physical_goods');
    expect(form.sellInApp).toBe(false);
    expect(form.storeManagedKind).toBe('none');
    expect(form.checkoutShippingAddress).toBe(true);
  });
});

describe('applyTitle', () => {
  it('derives the id from the name while the id is unlocked', () => {
    const form = applyTitle(defaultProduct(), 'Midweight Fleece Hoodie', false);
    expect(form.id).toBe('midweight-fleece-hoodie');
    expect(form.slug).toBe('midweight-fleece-hoodie');
  });

  it('leaves a hand-edited id untouched', () => {
    const form = applyTitle({ ...defaultProduct(), id: 'legacy-sku' }, 'New Name', true);
    expect(form.id).toBe('legacy-sku');
  });

  it('keeps a hand-edited storefront slug stable across later title edits', () => {
    const form = applyTitle(
      { ...defaultProduct(), title: 'Old title', slug: 'permanent-route' },
      'New title',
      false
    );
    expect(form.slug).toBe('permanent-route');
  });
});

describe('validateProduct route identity', () => {
  it('rejects missing and malformed storefront slugs', () => {
    expect(validateProduct(physical({ slug: '' }))).toContain('storefront URL slug');
    expect(validateProduct(physical({ slug: 'Unsafe Slug' }))).toContain('lowercase');
  });

  it('accepts a complete product with an explicit safe slug', () => {
    expect(validateProduct(physical({ shippingCountries: ['US'] }))).toBeNull();
  });
});

const existingProduct = {
  id: 'hoodie',
  title: 'Old Hoodie',
  description: 'Cozy',
  fiatAmountCents: 1000,
  fiatCurrency: 'usd',
  fulfillment: { type: 'shipping' },
  shippingProfile: 'physical',
  inventoryQuantity: 7,
  inventoryStatus: 'in_stock',
  checkoutRequirements: { email: 'required', shippingAddress: true },
  storeBilling: { kind: 'non_consumable', apple: { productId: 'com.x' } },
  images: [{ url: 'a.png' }, { url: 'b.png' }],
  metadata: {
    product_type: 'subscription',
    store_policy_fulfillment_type: 'physical_goods',
    shippingCountries: 'US,CA',
    cedros_stripe_sync_status: 'linked',
    custom: 'keep',
  },
  // Fields the form never manages — must survive an edit.
  variants: [{ id: 'v1' }],
  subscription: { billingPeriod: 'month' },
  slug: 'old-slug',
  stripeProductId: 'prod_1',
  cryptoAccount: 'acct',
  createdAt: '2020-01-01',
} as unknown as Product;

describe('formFromProduct', () => {
  it('maps an existing product back into editable form state', () => {
    const form = formFromProduct(existingProduct);
    expect(form.id).toBe('hoodie');
    expect(form.priceCents).toBe(1000);
    expect(form.fulfillmentType).toBe('shipping');
    expect(form.trackInventory).toBe(true);
    expect(form.inventoryQuantity).toBe(7);
    expect(form.productType).toBe('subscription');
    expect(form.shippingCountries).toEqual(['US', 'CA']);
    expect(form.sellInApp).toBe(true);
    expect(form.storeManagedKind).toBe('non_consumable');
    expect(form.appleProductId).toBe('com.x');
  });
});

describe('buildUpdatePayload', () => {
  it('preserves fields the form does not manage, including unknown metadata', () => {
    const payload = buildUpdatePayload(formFromProduct(existingProduct), existingProduct) as Record<string, unknown>;
    expect(payload.id).toBe('hoodie');
    expect(payload.variants).toEqual([{ id: 'v1' }]);
    expect(payload.subscription).toEqual({ billingPeriod: 'month' });
    expect(payload.slug).toBe('old-slug');
    expect(payload.stripeProductId).toBe('prod_1');
    expect(payload.cryptoAccount).toBe('acct');
    expect(payload.createdAt).toBe('2020-01-01');
    const metadata = payload.metadata as Record<string, string>;
    expect(metadata.cedros_stripe_sync_status).toBe('linked');
    expect(metadata.custom).toBe('keep');
  });

  it('replaces the primary image but keeps the rest of the gallery', () => {
    const form = { ...formFromProduct(existingProduct), imageUrl: 'new.png' };
    const payload = buildUpdatePayload(form, existingProduct) as Record<string, unknown>;
    expect(payload.images).toEqual([{ url: 'new.png', alt: 'Old Hoodie' }, { url: 'b.png' }]);
  });

  it('clears inventory when tracking is turned off', () => {
    const form = { ...formFromProduct(existingProduct), trackInventory: false };
    const payload = buildUpdatePayload(form, existingProduct) as Record<string, unknown>;
    expect(payload.inventoryQuantity).toBeNull();
    expect(payload.inventoryStatus).toBeNull();
  });

  it('clears store billing when in-app purchases are turned off', () => {
    const form = { ...formFromProduct(existingProduct), sellInApp: false };
    const payload = buildUpdatePayload(form, existingProduct) as Record<string, unknown>;
    expect(payload.storeBilling).toBeNull();
  });

  it('drops shipping-country metadata when delivery is no longer physical', () => {
    const form = { ...formFromProduct(existingProduct), fulfillmentType: 'digital_download' as const };
    const payload = buildUpdatePayload(form, existingProduct) as Record<string, unknown>;
    expect(payload.metadata).not.toHaveProperty('shippingCountries');
  });

  it('strips alternate stored shapes so the edited flat values win', () => {
    const nested = {
      id: 'x',
      title: 'X',
      description: 'd',
      price: { amountCents: 1000 },
      fiatPrice: { amountCents: 1000 },
      imageUrls: ['old.png'],
      displayName: 'Old Name',
    } as unknown as Product;
    const form = { ...formFromProduct(nested), priceCents: 4200, imageUrl: 'new.png' };
    const payload = buildUpdatePayload(form, nested) as Record<string, unknown>;
    expect(payload.price).toBeUndefined();
    expect(payload.fiatPrice).toBeUndefined();
    expect(payload.imageUrls).toBeUndefined();
    expect(payload.displayName).toBeUndefined();
    expect(payload.fiatAmountCents).toBe(4200);
    expect(payload.images).toEqual([{ url: 'new.png', alt: 'X' }]);
  });

  it('migrates a legacy imageUrls gallery into images[]', () => {
    const p = {
      id: 'x',
      title: 'X',
      description: 'd',
      fiatAmountCents: 1000,
      imageUrls: ['a.png', 'b.png'],
    } as unknown as Product;
    const payload = buildUpdatePayload(formFromProduct(p), p) as Record<string, unknown>;
    expect(payload.images).toEqual([{ url: 'a.png', alt: 'X' }, { url: 'b.png' }]);
    expect(payload.imageUrls).toBeUndefined();
  });

  it('leaves inventory untouched for non-physical products', () => {
    const p = {
      id: 'x',
      title: 'X',
      description: 'd',
      fiatAmountCents: 1000,
      fulfillment: { type: 'digital_download' },
      inventoryQuantity: 9,
      inventoryStatus: 'in_stock',
    } as unknown as Product;
    const payload = buildUpdatePayload(formFromProduct(p), p) as Record<string, unknown>;
    expect(payload.inventoryQuantity).toBe(9);
  });
});

describe('formFromProduct alternate shapes', () => {
  it('seeds price from a nested price shape and image from imageUrls', () => {
    const p = {
      id: 'x',
      description: 'd',
      price: { amountCents: 2500 },
      imageUrls: ['hero.png'],
    } as unknown as Product;
    const form = formFromProduct(p);
    expect(form.priceCents).toBe(2500);
    expect(form.imageUrl).toBe('hero.png');
  });

  it('falls back to the delivery-derived classification for an invalid stored policy', () => {
    const p = {
      id: 'x',
      description: 'd',
      fiatAmountCents: 100,
      shippingProfile: 'physical',
      metadata: { store_policy_fulfillment_type: 'bogus' },
    } as unknown as Product;
    expect(formFromProduct(p).storePolicyFulfillment).toBe('physical_goods');
  });
});

describe('country resolution', () => {
  it('resolves names and codes to an ISO code, and rejects unknown input', () => {
    expect(resolveCountry('United Kingdom')).toBe('GB');
    expect(resolveCountry('gb')).toBe('GB');
    expect(resolveCountry('England')).toBeNull();
  });

  it('maps a code back to its display name', () => {
    expect(countryName('US')).toBe('United States');
  });
});
