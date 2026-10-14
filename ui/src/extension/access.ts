import type {
  CedrosExtensionCrmSourceAccessManifest,
  CedrosExtensionCustomerTagAccessManifest,
  CedrosExtensionDatabaseAccessManifest,
  CedrosExtensionProviderAccessManifest,
} from './types';

export const cedrosPayProviderAccess: CedrosExtensionProviderAccessManifest[] = [
  {
    id: 'cedros-pay:storage',
    provider: 'storage',
    displayName: 'Cedros Pay Storage',
    description: 'Store and retrieve product or payment-related media through a host-owned storage provider.',
    scopes: ['storage.read', 'storage.write'],
    tags: ['commerce', 'media'],
  },
  {
    id: 'cedros-pay:email',
    provider: 'email',
    displayName: 'Cedros Pay Email',
    description: 'Send redacted payment, order, subscription, and webhook notification emails through the host email provider.',
    scopes: ['email.send'],
    tags: ['commerce', 'notifications'],
  },
  {
    id: 'cedros-pay:intelligence',
    provider: 'intelligence',
    displayName: 'Cedros Pay Intelligence',
    description: 'Generate payment and catalog assistance only through host-owned intelligence providers when AI endpoints are bound.',
    scopes: ['chat.generate'],
    tags: ['commerce', 'ai'],
  },
  {
    id: 'cedros-pay:blockchain-config',
    provider: 'blockchain',
    displayName: 'Blockchain config',
    description: 'Reads site-owned wallet and Solana RPC configuration for onchain payment verification.',
    scopes: ['blockchain.config.read'],
    tags: ['commerce', 'onchain'],
  },
  {
    id: 'cedros-pay:blockchain-x402-sign',
    provider: 'blockchain',
    displayName: 'x402 transaction signing',
    description: 'Requests policy-bound managed-wallet signatures for complete x402 Solana transactions.',
    scopes: ['blockchain.solana.sign.x402'],
    tags: ['commerce', 'onchain'],
  },
  {
    id: 'cedros-pay:blockchain-x402-refund',
    provider: 'blockchain',
    displayName: 'x402 refund execution',
    description:
      'Requests policy-bound managed-wallet signing and broadcast for idempotent x402 Solana refunds.',
    scopes: ['blockchain.solana.refund.x402'],
    tags: ['commerce', 'onchain', 'refunds'],
  },
  {
    id: 'cedros-pay:blockchain-assistant-x402-sign',
    provider: 'blockchain',
    displayName: 'Site Assistant x402 transaction signing',
    description:
      'Requests policy-bound dedicated Site Assistant wallet signatures for complete outbound x402 Solana transactions.',
    scopes: ['blockchain.solana.sign.assistant-x402'],
    tags: ['commerce', 'onchain', 'assistant'],
  },
];

export function cedrosPayDatabaseAccess(
  contentModels: readonly string[],
  migrations: readonly string[]
): CedrosExtensionDatabaseAccessManifest[] {
  const storeContentModels = contentModels.filter(
    (model) =>
      model !== 'cedros-pay:cache-coordination' &&
      model !== 'cedros-pay:settings-audit-records'
  );
  return [
    {
      id: 'cedros-pay:store-db',
      displayName: 'Cedros Pay Store Data',
      description:
        "Read, count, compare-and-set, and migrate Cedros Pay commerce records through the host's validated site-database seam, scope-checked per call.",
      contentModels: storeContentModels,
      migrations: [...migrations],
      tags: ['commerce', 'payments'],
      scopes: [
        {
          verb: 'read',
          resource:
            'Cedros Pay guarded checkout, cart, commerce, credits, subscription, webhook, audit, catalog, rollup, and compliance records',
          summary: 'Read Cedros Pay runtime state through the validated database seam.',
        },
        {
          verb: 'count',
          resource: 'Cedros Pay record counts',
          summary: 'Aggregate counts server-side without fetching rows.',
        },
        {
          verb: 'write',
          resource:
            'Cedros Pay guarded checkout, cart, commerce, credits, subscription, webhook, audit, catalog, rollup, and compliance records',
          summary:
            'Write Cedros Pay runtime state through database.compare-and-set; compatibility policy enrollment also requires this scope.',
        },
        {
          verb: 'delete',
          resource: 'Cedros Pay guarded checkout, cart, webhook-outbox, and processed-event records',
          summary:
            'Delete guarded records and retention rows atomically; setWritePolicy enrollment requires delete together with write.',
        },
        {
          verb: 'migrate',
          resource: 'Cedros Pay content-model collections',
          summary: 'Provision Cedros Pay content-model collections.',
        },
      ],
    },
    {
      id: 'cedros-pay:configuration-db',
      displayName: 'Cedros Pay Atomic Configuration',
      description:
        'Atomically compare-and-set Pay settings, encrypted secrets, audit history, compatibility mirrors, and committed revision through Core.',
      contentModels: ['cedros-pay:settings-audit-records'],
      migrations: [],
      tags: ['configuration', 'audit'],
      scopes: [
        {
          verb: 'read',
          resource: 'Cedros Pay secret-free configuration audit records',
          summary: 'Read committed configuration revisions and redacted audit history.',
        },
        {
          verb: 'write',
          resource: 'Cedros Pay atomic configuration transaction',
          summary:
            'Commit settings, secrets, mirrors, audit, revision, and idempotency receipt atomically.',
        },
      ],
    },
    {
      id: 'cedros-pay:cache-db',
      displayName: 'Cedros Pay Shared Cache Coordination',
      description:
        'Coordinate site-scoped, TTL-bounded shared cache fills and invalidations through Core-owned storage.',
      contentModels: ['cedros-pay:cache-coordination'],
      migrations: [],
      tags: ['cache', 'performance'],
      scopes: [
        {
          verb: 'write',
          resource: 'Cedros Pay shared cache coordination marker',
          summary:
            'Run fenced get, fill, put, and invalidation operations without direct cache-table access.',
        },
      ],
    },
  ];
}

export const cedrosPayCustomerTagAccess: CedrosExtensionCustomerTagAccessManifest[] = [
  {
    id: 'cedros-pay:customer-tags',
    displayName: 'Cedros Pay Customer Tags',
    description:
      'Apply CRM-visible purchase lifecycle tags from Cedros Pay webhook and reconcile activity.',
    scopes: ['assign', 'unassign', 'read'],
    managedTagSlugs: [
      'cedros-pay:first-purchase',
      'cedros-pay:repeat-customer',
      'cedros-pay:vip-customer',
      'cedros-pay:at-risk',
    ],
    tags: ['commerce', 'crm'],
  },
];

export const cedrosPayCrmSourceAccess: CedrosExtensionCrmSourceAccessManifest[] = [
  {
    id: 'cedros-pay:crm-source-events',
    sourceKind: 'cedros_pay',
    displayName: 'Cedros Pay CRM source events',
    description:
      'Attach Cedros Pay purchase, subscription, refund, failure, dispute, chargeback, and reversal activity to Data CRM profiles.',
    scopes: ['write'],
    eventTypes: [
      'purchase.completed',
      'subscription.created',
      'subscription.renewed',
      'subscription.canceled',
      'credit.purchase',
      'refund.settled',
      'payment.failed',
      'payment.reversed',
      'chargeback.opened',
      'dispute.opened',
      'dispute.updated',
      'dispute.closed',
    ],
    tags: ['commerce', 'crm'],
  },
];
