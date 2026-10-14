import { cedrosPayCapabilities } from './capabilities';
import { CEDROS_PAY_SECTION_IDS } from '../admin/sectionIds';
import {
  cedrosPayCrmSourceAccess,
  cedrosPayCustomerTagAccess,
  cedrosPayDatabaseAccess,
  cedrosPayProviderAccess,
} from './access';
import { cedrosPayAdminModules } from './adminModules';
import { cedrosPayAnalytics } from './analytics';
import { cedrosPayAiCapabilities } from './aiCapabilities';
import { buildCedrosExtensionRegistration, buildCedrosExtensionSurfaces } from './contracts';
import { cedrosPayOnboardingPages } from './onboarding';
import { cedrosPayServerRouteIds } from './serverRouteIds';
import { cedrosPaySetupSeeds } from './setupSeeds';
import {
  cedrosPayContentModelIds,
  cedrosPayMigrationIds,
  cedrosPayRequiredCapabilityIds,
  cedrosPayRequiredServiceIds,
  cedrosPaySettingsSchemaIds,
} from './serverInventory';
import { cedrosPayDocsArticles, cedrosPayFormTemplates, cedrosPayPolicies } from './starters';
import {
  CEDROS_PAY_ADMIN_MODULE_ID,
  CEDROS_PAY_DISPLAY_NAME,
  CEDROS_PAY_EXTENSION_DESCRIPTION,
  CEDROS_PAY_EXTENSION_ID,
  CEDROS_PAY_EXTENSION_VERSION,
  CEDROS_PAY_MIN_CEDROS_DATA_VERSION,
  CEDROS_PAY_REACT_NATIVE_VERSION,
  CEDROS_PAY_SERVER_VERSION,
  CEDROS_PAY_WIT_CHECKSUM,
} from './constants';
import { cloneCedrosPayJobSchedules } from './jobSchedules';
import {
  CEDROS_EXTENSION_PLATFORM_API_VERSION,
  type CedrosExtensionAiSurface,
  type CedrosExtensionManifest,
  type CedrosExtensionPackageFamily,
} from './types';

const cedrosPayPackageFamily: CedrosExtensionPackageFamily = {
  server: {
    packageName: 'cedros-pay',
    version: CEDROS_PAY_SERVER_VERSION,
    required: true,
  },
  react: {
    packageName: '@cedros/pay-react',
    version: CEDROS_PAY_EXTENSION_VERSION,
    required: true,
  },
  reactNative: {
    packageName: '@cedros/pay-react-native',
    version: CEDROS_PAY_REACT_NATIVE_VERSION,
    required: true,
  },
};

const cedrosPayAiSurface: CedrosExtensionAiSurface = {
  packageRef: 'server',
  capabilities: cedrosPayAiCapabilities,
  skills: [
    {
      id: 'cedros-pay:checkout',
      name: 'Checkout',
      description: 'Use canonical authoritative quotes, checkout attempts, and versioned carts after guarded activation.',
      category: 'commerce',
      visibility: 'public',
      docs: {
        markdown:
          '## Checkout\n\nUse the canonical `/extensions/cedros-pay/checkout*` routes for authoritative quote and checkout operations and `/extensions/cedros-pay/cart/*` for authenticated versioned-cart synchronization. These operations fail closed until Cedros platform proves the exact eighteen-model guarded-policy marker. No legacy one-time checkout aliases are published.',
      },
    },
    {
      id: 'cedros-pay:subscriptions',
      name: 'Subscriptions',
      description: 'Manage recurring billing flows for authenticated users.',
      category: 'billing',
      visibility: 'authenticated',
      docs: {
        markdown:
          '## Subscriptions\n\nCustomer integrations use `/extensions/cedros-pay/paywall/v1/subscription/*` with the end user’s Cedros Login session; Pay verifies buyer identity and subscription ownership. The separate `/extensions/cedros-pay/subscription/v1/*` routes require an explicitly declared service-to-service integration and its relying-party credential. Never expose that credential to a browser.',
      },
    },
    {
      id: 'cedros-pay:admin',
      name: 'Admin',
      description: 'Run authenticated Cedros Pay admin workflows for commerce operations.',
      category: 'admin',
      visibility: 'admin',
      docs: {
        markdown:
          '## Admin\n\nUse Cedros Pay admin APIs for payment configuration, products/catalog, orders, shipping, tax, subscriptions, refunds, invoices, checkout state, and operational billing workflows with admin authentication. Customer/person profiles live in Cedros platform CRM.',
      },
    },
  ],
};

export const cedrosPayExtensionManifest: CedrosExtensionManifest = {
  schemaVersion: 1,
  extensionId: CEDROS_PAY_EXTENSION_ID,
  displayName: CEDROS_PAY_DISPLAY_NAME,
  version: CEDROS_PAY_EXTENSION_VERSION,
  description: CEDROS_PAY_EXTENSION_DESCRIPTION,
  compatibility: {
    platformApiVersion: CEDROS_EXTENSION_PLATFORM_API_VERSION,
    minCedrosDataVersion: CEDROS_PAY_MIN_CEDROS_DATA_VERSION,
    witChecksum: CEDROS_PAY_WIT_CHECKSUM,
  },
  platformApiVersion: CEDROS_EXTENSION_PLATFORM_API_VERSION,
  packageFamily: cedrosPayPackageFamily,
  dependencies: {
    extensions: [
      {
        extensionId: 'cedros-login',
        minVersion: '0.0.71',
        required: false,
        reason:
          'Enables protected Cedros Pay admin and user-context workflows; those routes fail closed when Login is unavailable.',
      },
      {
        extensionId: 'cedros-notifications',
        minVersion: '0.1.9',
        required: false,
        reason:
          'Enables published notification route setup seeds for Cedros Pay payment and refund events.',
      },
      {
        extensionId: 'cedros-balance',
        minVersion: '0.5.0',
        required: false,
        reason:
          'Enables optional discovery of Balance 0.5.0 availability and its read grant; Cedros Pay money paths remain unchanged and no Balance mutation is claimed.',
      },
    ],
    capabilities: [
      {
        capabilityId: 'cedros-data:native-storefront-policy-read-v1',
        required: true,
        reason: 'Requires authoritative host-owned storefront policy before catalog and purchase operations; unavailable policy fails closed.',
      },
      {
        capabilityId: 'cedros-data:capacity-scope-check-v1',
        required: false,
        reason: 'Required by Usage/Capacity v1.0.0; missing capability disables capacity operations only.',
      },
      {
        capabilityId: 'cedros-data:capacity-authorization-redeem-v1',
        required: false,
        reason: 'Required by Usage/Capacity v1.0.0; missing capability disables capacity operations only.',
      },
      {
        capabilityId: 'cedros-data:capacity-grants-changed-v1',
        required: false,
        reason: 'Required by Usage/Capacity v1.0.0; missing capability disables capacity operations only.',
      },
      {
        capabilityId: 'cedros-data:capacity-delegation-check-v1',
        required: false,
        reason: 'Required by Usage/Capacity v1.0.0; missing capability disables capacity operations only.',
      },
      {
        capabilityId: 'cedros-login:admin-auth',
        required: false,
        reason:
          'Runtime integration for Cedros Pay admin/operator authorization; protected admin routes fail closed without it.',
      },
      {
        capabilityId: 'cedros-login:user-context',
        required: false,
        reason:
          'Runtime integration for authenticated checkout, subscription, credits, and compliance workflows; protected routes fail closed without it.',
      },
      {
        capabilityId: 'cedros-login:invite-discount',
        required: false,
        reason:
          'Applies live invite-granted subscription discounts at checkout; absent or failed lookups degrade to undiscounted pricing.',
      },
      {
        capabilityId: 'cedros-notifications:route-write',
        required: false,
        reason:
          'Enables owner-configurable notification routes for declared Cedros Pay server events.',
      },
      {
        capabilityId: 'cedros-balance:balance-read',
        required: false,
        reason:
          'Allows host capability discovery to expose optional read-only Balance state; missing or older Balance keeps dependent controls disabled.',
      },
      {
        capabilityId: 'cedros-data:ucp-platform-profiles-v1',
        required: true,
        reason: 'Required for public UCP platform identity discovery without site-management credentials.',
      },
      {
        capabilityId: 'cedros-data:extension-storage-cas-v1',
        required: true,
        reason:
          'Required for version-fenced, atomic Pay commerce mutations through database.compare-and-set.',
      },
      {
        capabilityId: 'cedros-data:extension-config-cas-v1',
        required: true,
        reason:
          'Required for atomic Pay settings, encrypted-secret, audit, mirror, revision, and idempotency commits.',
      },
      {
        capabilityId: 'cedros-data:extension-shared-cache-v1',
        required: true,
        reason:
          'Required for cross-worker, site-scoped read caching and fenced fill single-flight.',
      },
      {
        capabilityId: 'cedros-data:extension-invalidations-v1',
        required: true,
        reason:
          'Required for authorized durable admin data invalidations and reconnect reconciliation.',
      },
    ],
  },
  surfaces: {
    ...buildCedrosExtensionSurfaces({
      adminModuleIds: [CEDROS_PAY_ADMIN_MODULE_ID],
      serverRoutes: [...cedrosPayServerRouteIds],
      routeIds: [],
      blockTypes: [],
      templateIds: [],
      serverJobs: [
        'cedros-pay:sanctions-refresh',
        'cedros-pay:sanctions-sweep',
        'cedros-pay:balance-alert',
        'cedros-pay:health-check',
        'cedros-pay:cleanup',
        'cedros-pay:email',
        'cedros-pay:stats-rollup',
        'cedros-pay:catalog-sync',
        'cedros-pay:subscription-sync',
        'cedros-pay:webhook-delivery',
        'cedros-pay:x402-reconcile',
      ],
    }),
    server: {
      ...buildCedrosExtensionSurfaces({
        adminModuleIds: [CEDROS_PAY_ADMIN_MODULE_ID],
      }).server,
      contentModels: [...cedrosPayContentModelIds],
      migrations: [...cedrosPayMigrationIds],
      settingsSchemas: [...cedrosPaySettingsSchemaIds],
      routes: [...cedrosPayServerRouteIds],
      jobs: [
        'cedros-pay:sanctions-refresh',
        'cedros-pay:sanctions-sweep',
        'cedros-pay:balance-alert',
        'cedros-pay:health-check',
        'cedros-pay:cleanup',
        'cedros-pay:email',
        'cedros-pay:stats-rollup',
        'cedros-pay:catalog-sync',
        'cedros-pay:subscription-sync',
        'cedros-pay:webhook-delivery',
        'cedros-pay:x402-reconcile',
      ],
      events: [
        'cedros-pay:payment-succeeded',
        'cedros-pay:checkout-settled',
        'cedros-pay:payment-failed',
        'cedros-pay:refund-settled',
        'cedros-pay:chargeback-opened',
        'cedros-pay:payment-reversed',
        'cedros-pay:entitlement-changed',
        'cedros-pay:subscription-started',
        'cedros-pay:subscription-canceled',
        'cedros-pay:dispute-opened',
      ],
    },
    ai: cedrosPayAiSurface,
  },
  registration: buildCedrosExtensionRegistration(cedrosPayPackageFamily),
  adminModules: cedrosPayAdminModules,
  contentBlocks: [],
  contentTemplates: [],
  authoredSurfaces: [],
  pageSeeds: [],
  formTemplates: cedrosPayFormTemplates,
  docsArticles: cedrosPayDocsArticles,
  policies: cedrosPayPolicies,
  capabilities: cedrosPayCapabilities,
  analytics: cedrosPayAnalytics,
  jobSchedules: cloneCedrosPayJobSchedules(),
  setupSeeds: cedrosPaySetupSeeds,
  providerAccess: cedrosPayProviderAccess,
  databaseAccess: cedrosPayDatabaseAccess(cedrosPayContentModelIds, cedrosPayMigrationIds),
  customerTagAccess: cedrosPayCustomerTagAccess,
  crmSourceAccess: cedrosPayCrmSourceAccess,
  requiredServices: [...cedrosPayRequiredServiceIds],
  requiredCapabilities: [...cedrosPayRequiredCapabilityIds],
  onboardingPages: cedrosPayOnboardingPages,
};

export const CEDROS_PAY_EXTENSION_ADMIN_MODULE_IDS = [CEDROS_PAY_ADMIN_MODULE_ID] as const;
export const CEDROS_PAY_EXTENSION_SECTION_IDS = CEDROS_PAY_SECTION_IDS;
