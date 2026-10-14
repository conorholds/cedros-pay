import type { CedrosExtensionAiCapability } from './types';

const planSchema = {
  type: 'object',
  required: [
    'id',
    'title',
    'description',
    'priceMonthlyUsd',
    'priceAnnualUsd',
    'features',
    'isActive',
  ],
  properties: {
    id: {
      type: 'string',
      minLength: 1,
      maxLength: 120,
      pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    },
    title: { type: 'string', minLength: 1, maxLength: 120 },
    description: { type: 'string', maxLength: 2_000 },
    priceMonthlyUsd: { type: 'number', minimum: 0 },
    priceAnnualUsd: { type: 'number', minimum: 0 },
    features: {
      type: 'array',
      maxItems: 50,
      items: { type: 'string', maxLength: 240 },
    },
    featureHighlight: { type: 'string', maxLength: 240 },
    buttonText: { type: 'string', maxLength: 120 },
    isPopular: { type: 'boolean' },
    isActive: { type: 'boolean' },
    public: { type: 'boolean' },
    sortOrder: { type: 'integer' },
    stripePriceIdMonthly: {
      type: 'string',
      maxLength: 255,
      pattern: '^price_[A-Za-z0-9_]+$',
    },
    stripePriceIdAnnual: {
      type: 'string',
      maxLength: 255,
      pattern: '^price_[A-Za-z0-9_]+$',
    },
    stripeProductId: {
      type: 'string',
      maxLength: 255,
      pattern: '^prod_[A-Za-z0-9_]+$',
    },
    inventoryQuantity: { type: ['integer', 'null'], minimum: 0 },
  },
  additionalProperties: false,
};

export const subscriptionSettingsUpdateCapability: CedrosExtensionAiCapability = {
  id: 'cedros-pay:subscription-settings-update',
  name: 'Update Cedros Pay Subscription Settings',
  description:
    'Replace subscription page settings and plans through the existing admin settings route, including active public free plans for test or complimentary access.',
  kind: 'action',
  tags: ['subscriptions', 'billing'],
  visibility: 'admin',
  endpoint: {
    method: 'PUT',
    path: '/extensions/cedros-pay/admin/subscriptions/settings',
  },
  auth: { schemes: ['bearer-token'] },
  inputSchema: {
    type: 'object',
    required: ['enabled', 'plans'],
    properties: {
      enabled: { type: 'boolean' },
      plans: { type: 'array', maxItems: 100, items: planSchema },
      pageTitle: { type: 'string', maxLength: 160 },
      pageSubtitle: { type: 'string', maxLength: 500 },
      annualSavingsBadge: { type: 'string', maxLength: 120 },
      popularBadgeText: { type: 'string', maxLength: 120 },
      footerNotice: { type: 'string', maxLength: 500 },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    required: ['success', 'message', 'settings'],
    properties: {
      success: { type: 'boolean', const: true },
      message: { type: 'string' },
      settings: { type: 'object' },
    },
    additionalProperties: false,
  },
};
