import type {
  CedrosProductDefinition,
  CedrosStoreProductConfig,
  DistributionChannel,
  GooglePlayStoreProductConfig,
  StoreManagedProductKind,
} from '../types/storePolicy';

export interface MergeCedrosProductDefinitionArgs {
  fallbackId?: string;
  fallbackFulfillmentType?: CedrosProductDefinition['fulfillmentType'];
  catalogProduct?: CedrosProductDefinition;
  explicitProduct?: CedrosProductDefinition;
}

export interface ResolvedStoreProductConfiguration {
  productId: string;
  kind: StoreManagedProductKind;
  usedDefaultKind: boolean;
  storeProduct: CedrosStoreProductConfig;
}

export interface GooglePlaySubscriptionOfferLike {
  basePlanId: string;
  offerId: string | null;
  offerToken: string;
}

export interface GooglePlaySubscriptionLike {
  productId: string;
  subscriptionOfferDetails?: GooglePlaySubscriptionOfferLike[];
}

function mergeStoreProduct(
  catalogStoreProduct?: CedrosStoreProductConfig,
  explicitStoreProduct?: CedrosStoreProductConfig
): CedrosStoreProductConfig | undefined {
  if (!catalogStoreProduct && !explicitStoreProduct) {
    return undefined;
  }

  return {
    ...catalogStoreProduct,
    ...explicitStoreProduct,
    apple: {
      ...catalogStoreProduct?.apple,
      ...explicitStoreProduct?.apple,
    },
    google: {
      ...catalogStoreProduct?.google,
      ...explicitStoreProduct?.google,
    },
  };
}

export function mergeCedrosProductDefinition({
  fallbackId,
  fallbackFulfillmentType,
  catalogProduct,
  explicitProduct,
}: MergeCedrosProductDefinitionArgs): CedrosProductDefinition | undefined {
  const id = explicitProduct?.id ?? catalogProduct?.id ?? fallbackId;
  const fulfillmentType =
    explicitProduct?.fulfillmentType ??
    fallbackFulfillmentType ??
    catalogProduct?.fulfillmentType;

  if (!id || !fulfillmentType) {
    return undefined;
  }

  return {
    ...catalogProduct,
    ...explicitProduct,
    id,
    fulfillmentType,
    name: explicitProduct?.name ?? catalogProduct?.name,
    storeProduct: mergeStoreProduct(
      catalogProduct?.storeProduct,
      explicitProduct?.storeProduct
    ),
  };
}

function resolveConfiguredStoreProductId(
  product: CedrosProductDefinition,
  distributionChannel: DistributionChannel
): string {
  if (distributionChannel === 'apple_app_store') {
    return product.storeProduct?.apple?.productId ?? product.id;
  }

  if (distributionChannel === 'google_play_store') {
    return product.storeProduct?.google?.productId ?? product.id;
  }

  return product.id;
}

export function resolveStoreProductConfiguration(
  product: CedrosProductDefinition,
  distributionChannel: DistributionChannel
): ResolvedStoreProductConfiguration | null {
  if (
    distributionChannel !== 'apple_app_store' &&
    distributionChannel !== 'google_play_store'
  ) {
    return null;
  }

  const kind = product.storeProduct?.kind ?? 'non_consumable';

  return {
    productId: resolveConfiguredStoreProductId(product, distributionChannel),
    kind,
    usedDefaultKind: product.storeProduct?.kind === undefined,
    storeProduct: product.storeProduct ?? {},
  };
}

export function selectGooglePlayOffer(
  subscription: GooglePlaySubscriptionLike,
  config?: GooglePlayStoreProductConfig
): GooglePlaySubscriptionOfferLike | null {
  const offers = subscription.subscriptionOfferDetails ?? [];
  if (offers.length === 0) {
    return null;
  }

  if (config?.offerToken) {
    return (
      offers.find((offer) => offer.offerToken === config.offerToken) ?? null
    );
  }

  const filteredByBasePlan = config?.basePlanId
    ? offers.filter((offer) => offer.basePlanId === config.basePlanId)
    : offers;
  const filteredByOfferId = config?.offerId
    ? filteredByBasePlan.filter((offer) => offer.offerId === config.offerId)
    : filteredByBasePlan;

  if (filteredByOfferId.length === 1) {
    return filteredByOfferId[0];
  }

  if (filteredByOfferId.length === 0) {
    return null;
  }

  return offers.length === 1 ? offers[0] : null;
}
