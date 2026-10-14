import type { CedrosExtensionManifest } from './types';

export const cedrosPayCapabilities: CedrosExtensionManifest['capabilities'] = [
  {
    id: 'cedros-pay:capacity-offers-v1',
    displayName: 'capacity.offers',
    description: 'Usage/Capacity v1.0.0 financial owner operation; requires exact host authority and verified scope.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'cedros-pay:capacity-offers-v1',
        summary: 'Invoke the scoped capacity operation through its exact service route.',
      },
    ],
  },
  {
    id: 'cedros-pay:capacity-preview-v1',
    displayName: 'capacity.preview',
    description: 'Usage/Capacity v1.0.0 financial owner operation; requires exact host authority and verified scope.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'write',
        resource: 'cedros-pay:capacity-preview-v1',
        summary: 'Invoke the scoped capacity operation through its exact service route.',
      },
    ],
  },
  {
    id: 'cedros-pay:capacity-preview-read-v1',
    displayName: 'capacity.preview.read',
    description: 'Usage/Capacity v1.0.0 financial owner operation; requires exact host authority and verified scope.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'cedros-pay:capacity-preview-read-v1',
        summary: 'Invoke the scoped capacity operation through its exact service route.',
      },
    ],
  },
  {
    id: 'cedros-pay:capacity-purchase-v1',
    displayName: 'capacity.purchase',
    description: 'Usage/Capacity v1.0.0 financial owner operation; requires exact host authority and verified scope.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'write',
        resource: 'cedros-pay:capacity-purchase-v1',
        summary: 'Invoke the scoped capacity operation through its exact service route.',
      },
    ],
  },
  {
    id: 'cedros-pay:capacity-purchase-read-v1',
    displayName: 'capacity.purchase.read',
    description: 'Usage/Capacity v1.0.0 financial owner operation; requires exact host authority and verified scope.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'cedros-pay:capacity-purchase-read-v1',
        summary: 'Invoke the scoped capacity operation through its exact service route.',
      },
    ],
  },
  {
    id: 'cedros-pay:capacity-grants-snapshot-v1',
    displayName: 'capacity.grants.snapshot',
    description: 'Usage/Capacity v1.0.0 financial owner operation; requires exact host authority and verified scope.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'cedros-pay:capacity-grants-snapshot-v1',
        summary: 'Invoke the scoped capacity operation through its exact service route.',
      },
    ],
  },
  {
    id: 'cedros-pay:capacity-binding-read-v1',
    displayName: 'capacity.binding.read',
    description: 'Usage/Capacity v1.0.0 financial owner operation; requires exact host authority and verified scope.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'cedros-pay:capacity-binding-read-v1',
        summary: 'Invoke the scoped capacity operation through its exact service route.',
      },
    ],
  },
  {
    id: 'cedros-pay:capacity-billing-action-v1',
    displayName: 'capacity.billing.action',
    description: 'Usage/Capacity v1.0.0 financial owner operation; requires exact host authority and verified scope.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'write',
        resource: 'cedros-pay:capacity-billing-action-v1',
        summary: 'Invoke the scoped capacity operation through its exact service route.',
      },
    ],
  },
  {
    id: 'cedros-pay:capacity-cancel-v1',
    displayName: 'capacity.cancel',
    description: 'Usage/Capacity v1.0.0 financial owner operation; requires exact host authority and verified scope.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'write',
        resource: 'cedros-pay:capacity-cancel-v1',
        summary: 'Invoke the scoped capacity operation through its exact service route.',
      },
    ],
  },
  {
    id: 'cedros-pay:admin',
    displayName: 'Cedros Pay Admin',
    description: 'Manage Cedros Pay commerce configuration, catalog, orders, shipping, tax, and operations.',
    category: 'admin',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'cedros-pay admin operations',
        summary: 'Review Cedros Pay configuration, payments, catalog, orders, subscriptions, shipping, tax, and store operations.',
      },
      {
        verb: 'write',
        resource: 'cedros-pay admin operations',
        summary: 'Manage Cedros Pay configuration, catalog, orders, shipping, tax, refunds, and subscriptions.',
      },
    ],
  },
  {
    id: 'cedros-pay:balance-read',
    displayName: 'Cedros Pay Balance Read',
    description: 'Read-only Cedros Balance summary (gross, net, refunds, currency, time-series) via the cedros-pay:stats route.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'Cedros Balance summary',
        summary:
          'Read operator-aggregate Cedros Balance summary; never returns buyer identifiers or ledger rows.',
      },
    ],
  },
  {
    id: 'cedros-pay:subscription-read',
    displayName: 'Cedros Pay Subscription Read',
    description:
      'Read-only subscription metrics plus sanitized per-subscription plan entitlements for trusted host integrations.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'cedros-pay subscription metrics and plan entitlements',
        summary:
          'Read aggregate subscription metrics and the explicit sanitized entitlement namespace for a specific subscription; excludes payment credentials, provider secrets, wallet data, and unrelated product metadata.',
      },
    ],
  },
  {
    id: 'cedros-pay:product-rag-records',
    displayName: 'Cedros Pay Product RAG Records',
    description: "Publish support-safe live product records for Data's products RAG source.",
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'cedros-pay support-safe product RAG records',
        summary:
          'Read public/operator-approved product facts for chat grounding; excludes private buyer and purchase data.',
      },
    ],
  },
  {
    id: 'cedros-pay:product-read',
    displayName: 'Cedros Pay Product Read',
    description: 'Read Pay-backed storefront catalog products and derived categories for Shop rendering.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'cedros-pay storefront catalog products and derived categories',
        summary:
          'Read public active product/category data for storefront pages; excludes metadata, buyer, payment, wallet, provider, token, and secret data.',
      },
    ],
  },
  {
    id: 'cedros-pay:product-create',
    displayName: 'Cedros Pay Product Create',
    description: 'Create Pay-backed catalog products from trusted host surfaces such as booking and admin flows.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'write',
        resource: 'cedros-pay catalog product records',
        summary:
          'Create purchasable catalog products with bounded public fields (title, price, copy, media, categorization); cannot read or modify buyer, payment, wallet, provider, token, or secret data.',
      },
    ],
  },
  {
    id: 'cedros-pay:entitlement-read',
    displayName: 'Cedros Pay Entitlement Read',
    description: 'Check Pay-owned purchase and subscription entitlement state for Data gated media.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'cedros-pay media entitlement checks',
        summary:
          'Return boolean entitlement decisions for Data gated-media checks without payment, provider, wallet, or buyer profile details.',
      },
    ],
  },
  {
    id: 'cedros-pay:access-pass',
    displayName: 'Cedros Pay Access Pass',
    description:
      'Resolve Cash Captcha access-pass offers and authorize delegated-key-bound source requests.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'call',
        resource: 'cedros-pay access-pass offer resolution and request authorization',
        summary:
          'Resolve safe payment instructions and authorize one source-scoped pass without exposing wallet, provider, or ledger data.',
      },
    ],
  },
  {
    id: 'cedros-pay:checkout',
    displayName: 'Cedros Pay Checkout',
    description: 'Canonical authoritative quote and checkout operations for Cedros Shop 3 consumers.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'call',
        resource: 'cedros-pay-checkout:quote',
        summary: 'Create and replay authoritative, scope-isolated checkout quotes.',
      },
      {
        verb: 'call',
        resource: 'cedros-pay-checkout:checkout',
        summary: 'Create, resolve, inspect, and verify one durably correlated checkout attempt.',
      },
    ],
  },
  {
    id: 'cedros-pay:versioned-cart-write-v1',
    displayName: 'Cedros Pay Versioned Cart Write',
    description:
      'Authoritative customer-cart synchronization with generation fencing and durable idempotent mutation replay.',
    category: 'commerce',
    requestedScopes: [
      {
        verb: 'read',
        resource: 'authenticated buyer authoritative cart',
        summary: 'Open or read the current server-owned cart generation and authoritative cart state.',
      },
      {
        verb: 'write',
        resource: 'authenticated buyer authoritative cart',
        summary:
          'Rotate a customer generation or apply one version-guarded, idempotency-bound cart mutation.',
      },
    ],
  },
  {
    id: 'cedros-pay:site-brain-records',
    displayName: 'Cedros Pay Site Brain Records',
    description: 'Emit redacted operational records for setup, automation, compliance, messaging, and maintenance.',
    category: 'runtime',
    requestedScopes: [
      {
        verb: 'write',
        resource: 'site-brain-record:setup',
        summary: 'Publish redacted setup completion records.',
      },
      {
        verb: 'write',
        resource: 'site-brain-record:automation',
        summary: 'Publish redacted automation job outcome records.',
      },
      {
        verb: 'write',
        resource: 'site-brain-record:compliance',
        summary: 'Publish redacted compliance sweep records.',
      },
      {
        verb: 'write',
        resource: 'site-brain-record:maintenance',
        summary: 'Publish redacted retention and cleanup records.',
      },
      {
        verb: 'write',
        resource: 'site-brain-record:messaging',
        summary: 'Publish redacted email queue records.',
      },
      {
        verb: 'write',
        resource: 'site-brain-record:cedros-pay-catalog-administration',
        summary: 'Publish redacted catalog administration audit records.',
      },
    ],
  },
];
