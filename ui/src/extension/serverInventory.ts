export const cedrosPayContentModelIds = [
  'cedros-pay:access-passes',
  'cedros-pay:cart',
  'cedros-pay:catalog',
  'cedros-pay:catalog-fence',
  'cedros-pay:checkout-inventory-holds',
  'cedros-pay:checkout-operations',
  'cedros-pay:checkout-return-index',
  'cedros-pay:checkout-stock',
  'cedros-pay:commerce-ledger',
  'cedros-pay:compliance-assets',
  'cedros-pay:credits',
  'cedros-pay:customer-cart-generations',
  'cedros-pay:customer-cart-lanes',
  'cedros-pay:customer-cart-operations',
  'cedros-pay:customer-cart-tombstones',
  'cedros-pay:customer-carts',
  'cedros-pay:guarded-write-policy-state',
  'cedros-pay:program-access',
  'cedros-pay:cache-coordination',
  'cedros-pay:settings-audit-records',
  'cedros-pay:stats-rollup',
  'cedros-pay:subscriptions',
  'cedros-pay:support-ai',
  'cedros-pay:ucp-sessions',
  'cedros-pay:webhook-outbox',
] as const;

export const cedrosPayMigrationIds = [
  'cedros-pay:access-passes-v1',
  'cedros-pay:core-schema-v1',
  'cedros-pay:catalog-v1',
  'cedros-pay:catalog-fence-v1',
  'cedros-pay:orders-fulfillment-v1',
  'cedros-pay:subscription-billing-v1',
  'cedros-pay:webhook-outbox-v1',
  'cedros-pay:support-ai-v1',
  'cedros-pay:compliance-assets-v1',
  'cedros-pay:performance-indexes-v1',
  'cedros-pay:credits-v1',
  'cedros-pay:stats-rollup-v1',
  'cedros-pay:cart-v1',
  'cedros-pay:program-access-v1',
] as const;

export const cedrosPaySettingsSchemaIds = [
  'cedros-pay:payment-settings',
  'cedros-pay:store-settings',
  'cedros-pay:automation-settings',
  'cedros-pay:site_settings/tipping',
  'cedros-pay:site_settings/monetization',
] as const;

// Provider use is reviewed through providerAccess[]; the browser/admin runtime
// does not call provider host services directly.
export const cedrosPayRequiredServiceIds = [] as const;

export const cedrosPayRequiredCapabilityIds = [
  'cedros-data:native-storefront-policy-read-v1',
  'cedros-data:ucp-platform-profiles-v1',
  'cedros-data:extension-storage-cas-v1',
  'cedros-data:extension-config-cas-v1',
  'cedros-data:extension-shared-cache-v1',
  'cedros-data:extension-invalidations-v1',
] as const;
