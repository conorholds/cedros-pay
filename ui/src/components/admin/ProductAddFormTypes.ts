import type {
  StoreManagedProductKind,
  StorePolicyFulfillmentType,
} from './types';
import type { AdminProductType } from './productDisplay';

export type CheckoutRequirement = 'none' | 'optional' | 'required';
export type FulfillmentType = 'digital_download' | 'shipping' | 'service';

/**
 * Working state for the Add product page. Prices are held as integer minor
 * units (cents) so the money inputs never accumulate float drift; `null` means
 * "not set yet". UX-only flags (`trackInventory`, `sellInApp`) gate optional
 * sections and are not sent to the server verbatim — they shape the payload.
 */
export interface NewProductForm {
  id: string;
  slug: string;
  title: string;
  imageUrl: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  productType: AdminProductType;
  priceCents: number | null;
  compareAtCents: number | null;
  fiatCurrency: string;
  cryptoToken: string;
  trackInventory: boolean;
  inventoryQuantity: number | null;
  tags: string[];
  categoryIds: string[];
  checkoutEmail: CheckoutRequirement;
  checkoutName: CheckoutRequirement;
  checkoutPhone: CheckoutRequirement;
  checkoutShippingAddress: boolean;
  checkoutBillingAddress: boolean;
  shippingCountries: string[];
  fulfillmentType: FulfillmentType;
  storePolicyFulfillment: StorePolicyFulfillmentType;
  sellInApp: boolean;
  storeManagedKind: StoreManagedProductKind | 'none';
  appleProductId: string;
  googleProductId: string;
  googlePackageName: string;
  googleBasePlanId: string;
  googleOfferId: string;
  fulfillmentNotes: string;
  active: boolean;
}

export type NewProductUpdater = <K extends keyof NewProductForm>(
  key: K,
  value: NewProductForm[K]
) => void;
