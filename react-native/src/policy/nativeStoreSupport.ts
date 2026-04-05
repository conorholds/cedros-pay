import type {
  CedrosProductDefinition,
  DistributionChannel,
  NativeStoreMethod,
} from '../types/storePolicy';

export function resolveNativeStoreMethod(
  distributionChannel?: DistributionChannel
): NativeStoreMethod | null {
  if (distributionChannel === 'apple_app_store') {
    return 'apple_iap';
  }

  if (distributionChannel === 'google_play_store') {
    return 'google_play_billing';
  }

  return null;
}

export function isRestorableStoreProduct(
  product?: CedrosProductDefinition
): boolean {
  if (!product) {
    return false;
  }

  return product.storeProduct?.kind !== 'consumable';
}

export function isManageableStoreSubscription(
  product?: CedrosProductDefinition
): boolean {
  return product?.storeProduct?.kind === 'auto_renewable_subscription';
}
