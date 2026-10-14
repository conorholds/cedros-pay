export type CedrosExtensionSetupSeedInstallMode =
  | 'createIfMissing'
  | 'referenceOnly';

export type CedrosExtensionSetupSeedUpdatePolicy =
  | 'preserveOperatorEdits'
  | 'replaceIfUnmodified';

export type CedrosExtensionSetupSeedDisablePolicy =
  | 'leaveCreated'
  | 'disableIfUnmodified';

export interface CedrosExtensionSetupSeedLifecycleManifest {
  installMode?: CedrosExtensionSetupSeedInstallMode;
  updatePolicy?: CedrosExtensionSetupSeedUpdatePolicy;
  disablePolicy?: CedrosExtensionSetupSeedDisablePolicy;
}

export type CedrosExtensionProductSeedType =
  | 'standard'
  | 'service'
  | 'ticket'
  | 'eventSession'
  | 'campSession'
  | 'pass'
  | 'addon';

export interface CedrosExtensionPriceManifest {
  amountCents: number;
  currency: string;
  billingInterval?: string;
}

export interface CedrosExtensionProductVariantSeedManifest {
  id: string;
  displayName: string;
  sku?: string;
  price?: CedrosExtensionPriceManifest;
  attributes?: Record<string, string>;
}

export interface CedrosExtensionProductSeedManifest {
  id: string;
  displayName: string;
  title: string;
  productType: CedrosExtensionProductSeedType;
  description?: string;
  slug?: string;
  variants?: CedrosExtensionProductVariantSeedManifest[];
  tags?: string[];
  lifecycle?: CedrosExtensionSetupSeedLifecycleManifest;
}
