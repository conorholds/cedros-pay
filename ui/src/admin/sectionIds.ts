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
  { id: 'transactions',     qualifiedId: 'cedros-pay:transactions',     label: 'Transactions',    group: 'Store',         order: 0,  endpoints: ['GET /admin/transactions'] },
  { id: 'products',         qualifiedId: 'cedros-pay:products',         label: 'Products',        group: 'Store',         order: 1,  endpoints: ['GET /admin/products', 'POST /admin/products', 'PUT /admin/products/{id}', 'DELETE /admin/products/{id}'] },
  { id: 'subscriptions',    qualifiedId: 'cedros-pay:subscriptions',    label: 'Subscriptions',   group: 'Store',         order: 2,  endpoints: ['GET /admin/subscriptions', 'POST /admin/subscriptions', 'PUT /admin/subscriptions/{id}'] },
  { id: 'coupons',          qualifiedId: 'cedros-pay:coupons',          label: 'Coupons',         group: 'Store',         order: 3,  endpoints: ['GET /admin/coupons', 'POST /admin/coupons', 'PUT /admin/coupons/{id}', 'DELETE /admin/coupons/{id}'] },
  { id: 'refunds',          qualifiedId: 'cedros-pay:refunds',          label: 'Refunds',         group: 'Store',         order: 4,  endpoints: ['GET /admin/refunds', 'POST /admin/refunds/{id}/approve', 'POST /admin/refunds/{id}/deny'] },
  // ── Configuration group ──
  { id: 'storefront',       qualifiedId: 'cedros-pay:storefront',       label: 'Storefront',      group: 'Configuration', order: 10, endpoints: ['GET /admin/config/shop', 'PUT /admin/config/shop'] },
  { id: 'ai-settings',      qualifiedId: 'cedros-pay:ai-settings',      label: 'Store AI',        group: 'Configuration', order: 11, endpoints: ['GET /admin/config/ai', 'PUT /admin/config/ai/api-key', 'PUT /admin/config/ai/assignment', 'PUT /admin/config/ai/prompt'] },
  { id: 'faqs',             qualifiedId: 'cedros-pay:faqs',             label: 'Knowledge Base',  group: 'Configuration', order: 12, endpoints: ['GET /admin/faqs', 'POST /admin/faqs', 'PUT /admin/faqs/{id}', 'DELETE /admin/faqs/{id}'] },
  { id: 'payment-settings', qualifiedId: 'cedros-pay:payment-settings', label: 'Payment Options', group: 'Configuration', order: 13, endpoints: ['GET /admin/config/stripe', 'PUT /admin/config/stripe', 'GET /admin/config/x402', 'PUT /admin/config/x402', 'GET /admin/config/cedros_login', 'PUT /admin/config/cedros_login'] },
  { id: 'messaging',        qualifiedId: 'cedros-pay:messaging',        label: 'Store Messages',  group: 'Configuration', order: 14, endpoints: ['GET /admin/config/messaging', 'PUT /admin/config/messaging'] },
  { id: 'settings',         qualifiedId: 'cedros-pay:settings',         label: 'Store Server',    group: 'Configuration', order: 15, endpoints: ['GET /admin/config/server', 'PUT /admin/config/server'] },
] as const;

/** All qualified section IDs as a flat array — useful for allowlist generation */
export const CEDROS_PAY_SECTION_IDS = CEDROS_PAY_SECTIONS.map(s => s.qualifiedId);

/** Group metadata */
export const CEDROS_PAY_GROUPS = [
  { id: 'Store',         label: 'Store',         order: 1, defaultCollapsed: false },
  { id: 'Configuration', label: 'Configuration', order: 2, defaultCollapsed: true },
] as const;
