import type { Product } from '../types';

export function buildCartItemMetadataFromProduct(product: Product): Record<string, string> | undefined {
  const metadata: Record<string, string> = {};

  if (product.shippingProfile) metadata.shippingProfile = product.shippingProfile;

  if (product.checkoutRequirements) {
    metadata.checkoutRequirements = JSON.stringify(product.checkoutRequirements);
  }

  if (product.fulfillment?.type) metadata.fulfillmentType = product.fulfillment.type;
  if (product.fulfillment?.notes) metadata.fulfillmentNotes = product.fulfillment.notes;

   const shippingCountries = product.attributes?.shippingCountries;
   if (typeof shippingCountries === 'string' && shippingCountries.trim()) {
     metadata.shippingCountries = shippingCountries;
   }

  return Object.keys(metadata).length ? metadata : undefined;
}
