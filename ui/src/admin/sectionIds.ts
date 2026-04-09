/**
 * Exported section ID reference for integrators.
 *
 * Use CEDROS_PAY_SECTIONS for build-time allowlists, deep-link routing,
 * and integration tests — avoids grepping minified bundles.
 */

/** Section metadata for integrator reference */
export interface SectionReference {
  /** Unqualified ID (e.g. 'products') */
  id: string;
  /** Qualified ID with plugin prefix (e.g. 'cedros-pay:products') */
  qualifiedId: string;
  /** Human-readable label */
  label: string;
  /** Sidebar group */
  group: 'Store' | 'Configuration';
  /** Sort order within the group */
  order: number;
  /** Primary backend endpoints used by this section */
  endpoints: string[];
}

/**
 * All cedros-pay admin sections with their IDs, labels, groups, order values,
 * and the backend endpoints each section calls.
 *
 * Source of truth — kept in sync with `cedrosPayPlugin.sections` in plugin.tsx.
 */
export const CEDROS_PAY_SECTIONS: readonly SectionReference[] = [
  // ── Store group ──
  { id: 'transactions',     qualifiedId: 'cedros-pay:transactions',     label: 'Transactions',         group: 'Store',         order: 0,  endpoints: ['GET /admin/transactions'] },
  { id: 'orders',           qualifiedId: 'cedros-pay:orders',           label: 'Orders',               group: 'Store',         order: 1,  endpoints: ['GET /admin/orders', 'GET /admin/orders/{id}'] },
  { id: 'products',         qualifiedId: 'cedros-pay:products',         label: 'Products',             group: 'Store',         order: 2,  endpoints: ['GET /admin/products', 'POST /admin/products', 'PUT /admin/products/{id}', 'DELETE /admin/products/{id}'] },
  { id: 'subscriptions',    qualifiedId: 'cedros-pay:subscriptions',    label: 'Subscriptions',        group: 'Store',         order: 3,  endpoints: ['GET /admin/subscriptions', 'POST /admin/subscriptions', 'PUT /admin/subscriptions/{id}'] },
  { id: 'coupons',          qualifiedId: 'cedros-pay:coupons',          label: 'Coupons',              group: 'Store',         order: 4,  endpoints: ['GET /admin/coupons', 'POST /admin/coupons', 'PUT /admin/coupons/{id}', 'DELETE /admin/coupons/{id}'] },
  { id: 'refunds',          qualifiedId: 'cedros-pay:refunds',          label: 'Refunds',              group: 'Store',         order: 5,  endpoints: ['GET /admin/refunds', 'POST /admin/refunds/{id}/approve', 'POST /admin/refunds/{id}/deny'] },
  { id: 'compliance',       qualifiedId: 'cedros-pay:compliance',       label: 'Compliance',           group: 'Store',         order: 6,  endpoints: ['GET /admin/compliance/stats', 'POST /admin/compliance/check'] },
  { id: 'chat-logs',        qualifiedId: 'cedros-pay:chat-logs',        label: 'Chat Logs',            group: 'Store',         order: 7,  endpoints: ['GET /admin/chats', 'GET /admin/chats/{sessionId}'] },
  { id: 'customers',        qualifiedId: 'cedros-pay:customers',        label: 'Customers',            group: 'Store',         order: 8,  endpoints: ['GET /admin/customers', 'POST /admin/customers', 'PUT /admin/customers/{id}'] },
  { id: 'disputes',         qualifiedId: 'cedros-pay:disputes',         label: 'Disputes',             group: 'Store',         order: 9,  endpoints: ['GET /admin/disputes', 'GET /admin/disputes/{id}', 'PUT /admin/disputes/{id}/status'] },
  { id: 'returns',          qualifiedId: 'cedros-pay:returns',          label: 'Returns',              group: 'Store',         order: 10, endpoints: ['GET /admin/returns', 'GET /admin/returns/{id}', 'PUT /admin/returns/{id}/status'] },
  { id: 'images',           qualifiedId: 'cedros-pay:images',           label: 'Images',               group: 'Store',         order: 11, endpoints: ['GET /admin/images', 'POST /admin/images', 'DELETE /admin/images/{id}'] },
  { id: 'inventory',        qualifiedId: 'cedros-pay:inventory',        label: 'Inventory',            group: 'Store',         order: 12, endpoints: ['GET /admin/products', 'GET /admin/products/{id}/inventory/adjustments'] },
  // ── Configuration group ──
  { id: 'storefront',       qualifiedId: 'cedros-pay:storefront',       label: 'Storefront',           group: 'Configuration', order: 20, endpoints: ['GET /admin/config/shop', 'PUT /admin/config/shop'] },
  { id: 'ai-settings',      qualifiedId: 'cedros-pay:ai-settings',      label: 'Store AI',             group: 'Configuration', order: 21, endpoints: ['GET /admin/config/ai', 'PUT /admin/config/ai/api-key', 'PUT /admin/config/ai/assignment', 'PUT /admin/config/ai/prompt'] },
  { id: 'faqs',             qualifiedId: 'cedros-pay:faqs',             label: 'Knowledge Base',       group: 'Configuration', order: 22, endpoints: ['GET /admin/faqs', 'POST /admin/faqs', 'PUT /admin/faqs/{id}', 'DELETE /admin/faqs/{id}'] },
  { id: 'payment-settings', qualifiedId: 'cedros-pay:payment-settings', label: 'Payment Options',      group: 'Configuration', order: 23, endpoints: ['GET /admin/config/stripe', 'PUT /admin/config/stripe', 'GET /admin/config/x402', 'PUT /admin/config/x402', 'GET /admin/config/cedros_login', 'PUT /admin/config/cedros_login'] },
  { id: 'token22',          qualifiedId: 'cedros-pay:token22',          label: 'Gift Cards & Token-22', group: 'Configuration', order: 24, endpoints: ['GET /admin/token22/status', 'POST /admin/token22/initialize', 'POST /admin/token22/harvest-fees', 'GET /admin/gift-card-redemptions'] },
  { id: 'messaging',        qualifiedId: 'cedros-pay:messaging',        label: 'Store Messages',       group: 'Configuration', order: 25, endpoints: ['GET /admin/config/messaging', 'PUT /admin/config/messaging'] },
  { id: 'webhooks',         qualifiedId: 'cedros-pay:webhooks',         label: 'Webhooks',             group: 'Configuration', order: 26, endpoints: ['GET /admin/webhooks', 'POST /admin/webhooks/{id}/retry', 'DELETE /admin/webhooks/{id}', 'GET /admin/webhooks/dlq'] },
  { id: 'shipping',         qualifiedId: 'cedros-pay:shipping',         label: 'Shipping',             group: 'Configuration', order: 27, endpoints: ['GET /admin/shipping/profiles', 'POST /admin/shipping/profiles', 'GET /admin/shipping/profiles/{id}/rates'] },
  { id: 'tax',              qualifiedId: 'cedros-pay:tax',              label: 'Tax Rates',            group: 'Configuration', order: 28, endpoints: ['GET /admin/tax/rates', 'POST /admin/tax/rates', 'PUT /admin/tax/rates/{id}', 'DELETE /admin/tax/rates/{id}'] },
  { id: 'settings',         qualifiedId: 'cedros-pay:settings',         label: 'Store Server',         group: 'Configuration', order: 29, endpoints: ['GET /admin/config/server', 'PUT /admin/config/server'] },
] as const;

/** All qualified section IDs as a flat array — useful for allowlist generation */
export const CEDROS_PAY_SECTION_IDS = CEDROS_PAY_SECTIONS.map(s => s.qualifiedId);

/** Group metadata */
export const CEDROS_PAY_GROUPS = [
  { id: 'Store',         label: 'Store',         order: 1, defaultCollapsed: false },
  { id: 'Configuration', label: 'Configuration', order: 2, defaultCollapsed: true },
] as const;
