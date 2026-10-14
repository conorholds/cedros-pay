import type { CedrosExtensionAiCapability } from './types';
import { cedrosPayOperatingCapabilities } from './operatingCapabilities';
import { capacityAdminCapabilities } from './capacityAdminCapabilities';
import { subscriptionSettingsUpdateCapability } from './subscriptionSettingsCapability';

const handleSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 120,
  pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
};

const metadataSchema = { type: 'object', maxProperties: 64 };

const productIdSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 120,
  pattern: '^[A-Za-z0-9._-]+$',
};

const mutationOutputSchema = {
  type: 'object',
  required: ['kind', 'created', 'recordId', 'record'],
  properties: {
    kind: { type: 'string' },
    created: { type: 'boolean' },
    recordId: { type: 'string' },
    record: { type: 'object' },
  },
  additionalProperties: false,
};

export const assistantX402PurchaseInputSchema = {
  type: 'object',
  required: ['resourceUrl'],
  properties: {
    resourceUrl: { type: 'string', format: 'uri', maxLength: 2048 },
    maxAmountMicrounits: { type: 'integer', minimum: 1 },
  },
  additionalProperties: false,
};

export const assistantX402PurchaseOutputSchema = {
  type: 'object',
  required: ['boundary', 'target', 'output', 'isError', 'replayed', 'rollback'],
  properties: {
    boundary: { type: 'string', const: 'cedros_pay_x402_purchase' },
    target: { type: 'string', format: 'uri', maxLength: 2048 },
    output: {
      type: 'object',
      required: ['status', 'message'],
      properties: {
        status: {
          type: 'string',
          enum: [
            'approval_required',
            'budget_denied',
            'vault_policy_denied',
            'insufficient_balance',
            'wallet_unavailable',
            'wallet_pending',
            'wallet_rotating',
            'wallet_disabled',
            'wallet_blocked',
            'cluster_mismatch',
            'stale_wallet_version',
            'transaction_failed',
            'ambiguous',
            'failed',
            'confirmed',
          ],
        },
        message: { type: 'string', minLength: 1, maxLength: 2000 },
        failureCode: {
          type: 'string',
          enum: [
            'balance_check_failed',
            'budget_denied',
            'changed_requirement',
            'cluster_mismatch',
            'discovery_failure',
            'invalid_requirement',
            'payer_mismatch',
            'policy_denied',
            'replay_mismatch',
            'signing_rejected',
            'stale_wallet_version',
            'submission_failure',
            'transaction_failed',
            'wrong_wallet',
          ],
        },
        assistantId: { type: 'string', const: 'ai-assistant' },
        walletPurpose: { type: 'string', const: 'site-assistant' },
        payerPublicKey: { type: 'string', pattern: '^[1-9A-HJ-NP-Za-km-z]{32,44}$' },
        cluster: {
          type: 'string',
          enum: ['devnet', 'testnet', 'mainnet-beta', 'localnet'],
        },
        policyDecisionId: { type: 'string', minLength: 1, maxLength: 512 },
        transactionResult: {
          type: 'object',
          required: ['status', 'signature'],
          properties: {
            status: { type: 'string', enum: ['confirmed', 'finalized'] },
            signature: { type: 'string', pattern: '^[1-9A-HJ-NP-Za-km-z]{64,96}$' },
          },
          additionalProperties: false,
        },
        postcondition: {
          type: 'object',
          required: [
            'verified',
            'target',
            'request_target_digest',
            'state_digest',
            'status',
          ],
          properties: {
            verified: { type: 'boolean', const: true },
            target: { type: 'string', format: 'uri', maxLength: 2048 },
            request_target_digest: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
            state_digest: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
            status: { type: 'string', const: 'completed' },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    isError: { type: 'boolean' },
    replayed: { type: 'boolean' },
    rollback: { type: 'null' },
  },
  additionalProperties: false,
};

export const cedrosPayAiCapabilities: CedrosExtensionAiCapability[] = [
  {
    id: 'cedros-pay:assistant-x402-purchase',
    name: 'Site Assistant x402 Purchase',
    description:
      'Implements Assistant action cedros.monetization.x402.purchase through the cedros_pay_x402_purchase boundary using only the dedicated Site Assistant wallet.',
    kind: 'action',
    tags: ['commerce', 'x402', 'assistant'],
    visibility: 'authenticated',
    endpoint: {
      method: 'POST',
      path: '/extensions/cedros-pay/assistant/v1/x402/purchase',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: assistantX402PurchaseInputSchema,
    outputSchema: assistantX402PurchaseOutputSchema,
  },
  {
    id: 'cedros-pay:guarded-policy-enroll',
    name: 'Enroll Cedros Pay Guarded Write Policy',
    description:
      'Idempotently enroll the exact compiled Cedros Pay model set in guarded-only database enforcement.',
    kind: 'action',
    tags: ['catalog', 'billing'],
    visibility: 'admin',
    endpoint: {
      method: 'POST',
      path: '/extensions/cedros-pay/admin/guarded-policy/enroll',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: { type: 'object', maxProperties: 0, additionalProperties: false },
    outputSchema: {
      type: 'object',
      required: ['newlyEnrolled', 'modelCount', 'modelSetSha256'],
      properties: {
        newlyEnrolled: { type: 'boolean' },
        modelCount: { type: 'integer', minimum: 1 },
        modelSetSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      },
      additionalProperties: false,
    },
  },
  {
    id: 'cedros-pay:catalog-records-query',
    name: 'Query Cedros Pay Catalog Records',
    description:
      'Read products, recurring prices, metadata, and program entitlement configuration by stable handle.',
    kind: 'tool',
    tags: ['catalog', 'billing'],
    visibility: 'admin',
    endpoint: {
      method: 'POST',
      path: '/extensions/cedros-pay/admin/catalog/records/query',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: {
      type: 'object',
      properties: {
        stableHandle: handleSchema,
        recordType: { type: 'string', enum: ['product', 'programEntitlement'] },
        includeArchived: { type: 'boolean', default: false },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      required: ['records', 'count'],
      properties: {
        records: { type: 'array', items: { type: 'object' } },
        count: { type: 'integer', minimum: 0 },
      },
      additionalProperties: false,
    },
  },
  {
    id: 'cedros-pay:capacity-activation-status',
    name: 'Read Cedros Pay Capacity Activation Status',
    description:
      'Read redacted Stripe mode and capacity sales gates without secrets, customer IDs, or subscription IDs.',
    kind: 'tool',
    tags: ['capacity', 'billing', 'readiness'],
    visibility: 'admin',
    endpoint: {
      method: 'POST',
      path: '/extensions/cedros-pay/admin/capacity/activation/status',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: {
      type: 'object',
      required: [
        'stripeMode',
        'stripeEnabled',
        'capacityConfigurationPresent',
        'capacityLoadable',
        'capacityEnvironment',
        'salesEnabled',
        'jointActivationVerified',
        'organizationCount',
        'readyOrganizationCount',
      ],
      properties: {
        stripeMode: { type: ['string', 'null'] },
        stripeEnabled: { type: ['boolean', 'null'] },
        capacityConfigurationPresent: { type: 'boolean' },
        capacityLoadable: { type: 'boolean' },
        capacityEnvironment: { type: ['string', 'null'] },
        salesEnabled: { type: ['boolean', 'null'] },
        jointActivationVerified: { type: ['boolean', 'null'] },
        organizationCount: { type: 'integer', minimum: 0 },
        readyOrganizationCount: { type: 'integer', minimum: 0 },
      },
      additionalProperties: false,
    },
  },
  {
    id: 'cedros-pay:capacity-tax-readiness',
    name: 'Read Cedros Pay Capacity Tax Readiness',
    description:
      'Read Stripe Tax setup, registration count, and tax-code coverage for linked add-ons without customer or account details.',
    kind: 'tool',
    tags: ['capacity', 'billing', 'readiness'],
    visibility: 'admin',
    endpoint: {
      method: 'POST',
      path: '/extensions/cedros-pay/admin/capacity/tax/readiness',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: {
      type: 'object',
      required: [
        'stripeMode',
        'taxSettingsStatus',
        'defaultTaxCode',
        'defaultTaxBehavior',
        'activeRegistrationCount',
        'registrationListComplete',
        'linkedAddOnProductCount',
        'linkedAddOnMissingTaxCodeHandles',
      ],
      properties: {
        stripeMode: { type: 'string', enum: ['live', 'test'] },
        taxSettingsStatus: { type: 'string', enum: ['active', 'pending'] },
        defaultTaxCode: { type: ['string', 'null'] },
        defaultTaxBehavior: { type: ['string', 'null'] },
        activeRegistrationCount: { type: 'integer', minimum: 0 },
        registrationListComplete: { type: 'boolean' },
        linkedAddOnProductCount: { type: 'integer', minimum: 0 },
        linkedAddOnMissingTaxCodeHandles: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      additionalProperties: false,
    },
  },
  {
    id: 'cedros-pay:catalog-product-upsert',
    name: 'Upsert Cedros Pay Product',
    description:
      'Create or update one product idempotently by stable handle without changing attached recurring prices.',
    kind: 'action',
    tags: ['catalog', 'billing'],
    visibility: 'admin',
    endpoint: {
      method: 'PUT',
      path: '/extensions/cedros-pay/admin/catalog/products/upsert',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: {
      type: 'object',
      required: ['product'],
      properties: {
        product: {
          type: 'object',
          required: [
            'stableHandle',
            'displayName',
            'status',
            'public',
            'purchasable',
            'productType',
          ],
          properties: {
            stableHandle: handleSchema,
            displayName: { type: 'string', minLength: 1, maxLength: 120 },
            description: { type: 'string', maxLength: 2000 },
            status: { type: 'string', enum: ['draft', 'active', 'archived', 'legacy'] },
            public: { type: 'boolean' },
            purchasable: { type: 'boolean' },
            productType: { type: 'string', enum: ['subscription', 'capacityAddOn'] },
            sortOrder: { type: 'integer' },
            metadata: metadataSchema,
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    outputSchema: mutationOutputSchema,
  },
  {
    id: 'cedros-pay:catalog-product-active-set',
    name: 'Set Cedros Pay Product Active State',
    description:
      'Make one existing catalog product active or inactive while preserving its other product fields.',
    kind: 'action',
    tags: ['catalog', 'billing'],
    visibility: 'admin',
    endpoint: {
      method: 'POST',
      path: '/extensions/cedros-pay/admin/catalog/products/active',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: {
      type: 'object',
      required: ['productId', 'active'],
      properties: {
        productId: productIdSchema,
        active: { type: 'boolean' },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      required: ['productId', 'active', 'product'],
      properties: {
        productId: productIdSchema,
        active: { type: 'boolean' },
        product: { type: 'object' },
      },
      additionalProperties: false,
    },
  },
  {
    id: 'cedros-pay:catalog-product-delete',
    name: 'Delete Cedros Pay Product',
    description:
      'Permanently delete one catalog product after explicit confirmation; products with authoritative stock are rejected.',
    kind: 'action',
    tags: ['catalog', 'billing'],
    visibility: 'admin',
    endpoint: {
      method: 'POST',
      path: '/extensions/cedros-pay/admin/catalog/products/delete',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: {
      type: 'object',
      required: ['productId', 'confirmed'],
      properties: {
        productId: productIdSchema,
        confirmed: { type: 'boolean', const: true },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      required: ['productId', 'deleted'],
      properties: {
        productId: productIdSchema,
        deleted: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    id: 'cedros-pay:catalog-price-upsert',
    name: 'Upsert Cedros Pay Recurring Price',
    description:
      'Create or update one recurring product price idempotently by product and price stable handles.',
    kind: 'action',
    tags: ['catalog', 'billing'],
    visibility: 'admin',
    endpoint: {
      method: 'PUT',
      path: '/extensions/cedros-pay/admin/catalog/prices/upsert',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: {
      type: 'object',
      required: ['productHandle', 'price'],
      properties: {
        productHandle: handleSchema,
        price: {
          type: 'object',
          required: [
            'stableHandle',
            'unitAmountCents',
            'currency',
            'billingInterval',
            'status',
            'public',
            'purchasable',
          ],
          properties: {
            stableHandle: handleSchema,
            unitAmountCents: { type: 'integer', minimum: 1 },
            currency: { type: 'string', pattern: '^[A-Za-z]{3}$' },
            billingInterval: { type: 'string', enum: ['month', 'year'] },
            billingIntervalCount: { type: 'integer', minimum: 1, maximum: 12, default: 1 },
            status: { type: 'string', enum: ['draft', 'active', 'archived'] },
            public: { type: 'boolean' },
            purchasable: { type: 'boolean' },
            trialDays: { type: 'integer', minimum: 0, maximum: 365 },
            stripePriceId: {
              type: 'string',
              pattern: '^price_[A-Za-z0-9_]+$',
              maxLength: 255,
            },
            metadata: metadataSchema,
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      required: ['kind', 'created', 'productId', 'priceId', 'price', 'catalogVersion'],
      properties: {
        kind: { type: 'string', enum: ['price'] },
        created: { type: 'boolean' },
        productId: { type: 'string' },
        priceId: { type: 'string' },
        price: { type: 'object' },
        catalogVersion: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    id: 'cedros-pay:catalog-stripe-tax-code-set',
    name: 'Set Cedros Pay Add-on Stripe Tax Code',
    description:
      'Set and verify the Stripe product tax code for one linked capacity add-on by catalog stable handle.',
    kind: 'action',
    tags: ['catalog', 'billing', 'stripe', 'tax'],
    visibility: 'admin',
    endpoint: {
      method: 'POST',
      path: '/extensions/cedros-pay/admin/catalog/products/stripe-tax-code',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: {
      type: 'object',
      required: ['productHandle', 'taxCode'],
      properties: {
        productHandle: handleSchema,
        taxCode: { type: 'string', pattern: '^txcd_[A-Za-z0-9_]+$', maxLength: 160 },
      },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      required: ['productHandle', 'stripeProductId', 'taxCode', 'taxCodeName', 'updated'],
      properties: {
        productHandle: handleSchema,
        stripeProductId: { type: 'string', pattern: '^prod_[A-Za-z0-9_]+$' },
        taxCode: { type: 'string', pattern: '^txcd_[A-Za-z0-9_]+$' },
        taxCodeName: { type: 'string' },
        updated: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  {
    id: 'cedros-pay:catalog-stripe-sync',
    name: 'Sync Cedros Pay Product to Stripe',
    description:
      'Synchronize one active purchasable catalog product and its recurring prices to Stripe by stable handle.',
    kind: 'action',
    tags: ['catalog', 'billing', 'stripe'],
    visibility: 'admin',
    endpoint: {
      method: 'POST',
      path: '/extensions/cedros-pay/admin/catalog/products/sync-stripe',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: {
      type: 'object',
      required: ['productHandle'],
      properties: { productHandle: handleSchema },
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      required: [
        'product', 'stripeProductId', 'createdStripeProduct', 'createdStripePrice',
        'createdStripePriceCount', 'replacedStripePrice', 'replacedStripePriceCount',
        'prices', 'warnings',
      ],
      properties: {
        product: { type: 'object' },
        stripeProductId: { type: 'string', pattern: '^prod_[A-Za-z0-9_]+$' },
        createdStripeProduct: { type: 'boolean' },
        createdStripePrice: { type: 'boolean' },
        createdStripePriceCount: { type: 'integer', minimum: 0 },
        replacedStripePrice: { type: 'boolean' },
        replacedStripePriceCount: { type: 'integer', minimum: 0 },
        prices: { type: 'array', items: { type: 'object' } },
        warnings: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
  },
  subscriptionSettingsUpdateCapability,
  {
    id: 'cedros-pay:program-entitlement-upsert',
    name: 'Upsert Cedros Pay Program Entitlement',
    description:
      'Create or update a controlled identity-bound Ambassador, Affiliate, or Sales Partner entitlement without exposing activation codes.',
    kind: 'action',
    tags: ['catalog', 'billing'],
    visibility: 'admin',
    endpoint: {
      method: 'PUT',
      path: '/extensions/cedros-pay/admin/catalog/program-entitlements/upsert',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: {
      type: 'object',
      required: ['entitlement'],
      properties: {
        entitlement: {
          type: 'object',
          required: ['stableHandle', 'displayName', 'program', 'status'],
          properties: {
            stableHandle: handleSchema,
            displayName: { type: 'string', minLength: 1, maxLength: 120 },
            program: { type: 'string', enum: ['ambassador', 'affiliate', 'salesPartner'] },
            status: { type: 'string', enum: ['draft', 'active', 'archived'] },
            monthlyPriceCents: { type: 'integer', minimum: 1 },
            annualPriceCents: { type: 'integer', minimum: 1 },
            currency: { type: 'string', pattern: '^[A-Za-z]{3}$', default: 'USD' },
            expiresAt: { type: 'string', maxLength: 64 },
            renewalRequired: { type: 'boolean', default: false },
            minimumQualifiedSalesPerMonth: { type: 'integer', minimum: 1 },
            fallbackPlanHandle: handleSchema,
            metadata: metadataSchema,
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    outputSchema: mutationOutputSchema,
  },
  {
    id: 'cedros-pay:program-invite-upsert',
    name: 'Upsert Cedros Pay Program Invite',
    description:
      'Create, rotate, expire, or revoke an identity-bound program invite using only a SHA-256 activation-code digest.',
    kind: 'action',
    tags: ['catalog', 'billing'],
    visibility: 'admin',
    endpoint: {
      method: 'PUT',
      path: '/extensions/cedros-pay/admin/catalog/program-invites/upsert',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: {
      type: 'object',
      required: ['invite'],
      properties: {
        invite: {
          type: 'object',
          required: ['stableHandle', 'programHandle', 'subjectId', 'status'],
          properties: {
            stableHandle: handleSchema,
            programHandle: handleSchema,
            subjectId: { type: 'string', minLength: 1, maxLength: 240 },
            activationCodeSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
            status: { type: 'string', enum: ['active', 'revoked', 'expired'] },
            expiresAt: { type: 'string', maxLength: 64 },
            metadata: metadataSchema,
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    outputSchema: mutationOutputSchema,
  },
  {
    id: 'cedros-pay:program-membership-upsert',
    name: 'Upsert Cedros Pay Program Membership',
    description:
      'Approve, expire, revoke, or transition one identity-bound program pricing membership without deleting customer work.',
    kind: 'action',
    tags: ['catalog', 'billing'],
    visibility: 'admin',
    endpoint: {
      method: 'PUT',
      path: '/extensions/cedros-pay/admin/catalog/program-memberships/upsert',
    },
    auth: { schemes: ['bearer-token'] },
    inputSchema: {
      type: 'object',
      required: ['membership'],
      properties: {
        membership: {
          type: 'object',
          required: ['subjectId', 'programHandle', 'status'],
          properties: {
            subjectId: { type: 'string', minLength: 1, maxLength: 240 },
            programHandle: handleSchema,
            status: { type: 'string', enum: ['active', 'revoked', 'expired'] },
            expiresAt: { type: 'string', maxLength: 64 },
            transitionPlanHandle: handleSchema,
            metadata: metadataSchema,
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    outputSchema: mutationOutputSchema,
  },
  ...cedrosPayOperatingCapabilities,
  ...capacityAdminCapabilities,
];
