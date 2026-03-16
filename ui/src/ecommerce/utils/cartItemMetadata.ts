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

  if (product.tokenizedAssetConfig) {
    metadata.tokenizedAsset = 'true';
    if (product.tokenizedAssetConfig.regulatoryNotice) {
      metadata.regulatoryNotice = product.tokenizedAssetConfig.regulatoryNotice;
    }
    if (product.tokenizedAssetConfig.assetClass) {
      metadata.assetClass = product.tokenizedAssetConfig.assetClass;
    }
    if (product.tokenizedAssetConfig.backingValueCents != null) {
      metadata.backingValueCents = String(product.tokenizedAssetConfig.backingValueCents);
    }
    if (product.tokenizedAssetConfig.backingCurrency) {
      metadata.backingCurrency = product.tokenizedAssetConfig.backingCurrency;
    }
  }

  return Object.keys(metadata).length ? metadata : undefined;
}
