/**
 * Exported section ID reference for integrators.
 *
 * Use CEDROS_PAY_SECTIONS for build-time allowlists, deep-link routing,
 * and integration tests — avoids grepping minified bundles.
 *
 * Sidebar shape follows Cedros AdminShell ownership: commerce operations live
 * under Monetization, while Pay-owned setup, credentials, and content payment
 * controls live under Extension Settings.
 */

/** Tab metadata embedded on umbrella SectionReferences */
export interface SectionTabReference {
  /** Unqualified tab ID (e.g. 'products') */
  id: string;
  /** Qualified tab ID (e.g. 'cedros-pay:products') */
  qualifiedId: string;
  /** Human-readable label rendered on the tab control */
  label: string;
}

/** Section metadata for integrator reference */
export interface SectionReference {
  /** Unqualified ID (e.g. 'catalog') */
  id: string;
  /** Qualified ID with plugin prefix (e.g. 'cedros-pay:catalog') */
  qualifiedId: string;
  /** Human-readable label */
  label: string;
  /** Official Cedros AdminShell sidebar group merge key */
  group: 'Monetization' | 'Extension Settings';
  /** Sort order within the group */
  order: number;
  /** Host permission required before the section is exposed */
  requiredPermission: string;
  /**
   * Tabs rendered inside this section when it is a tabbed umbrella.
   * Empty array for sections that render a single workflow directly.
   */
  tabs: readonly SectionTabReference[];
}

/** Tab-level subsection metadata (rendered inside an umbrella SectionReference) */
export interface SubsectionReference {
  /** Unqualified tab ID (e.g. 'products') */
  id: string;
  /** Qualified ID with plugin prefix (e.g. 'cedros-pay:products') */
  qualifiedId: string;
  /** Human-readable label */
  label: string;
  /** Parent umbrella section's unqualified ID */
  parentId: string;
  /** Primary backend endpoints used by this subsection */
  endpoints: string[];
}

/**
 * Tab-level subsections living inside the umbrella sections.
 * Retained for endpoint documentation and to keep stable identifiers
 * for backend telemetry, even though the host sidebar only renders the
 * umbrella parents.
 */
export const CEDROS_PAY_SUBSECTIONS: readonly SubsectionReference[] = [
  // ── Catalog ──
  { id: 'products',         qualifiedId: 'cedros-pay:products',         label: 'Products',        parentId: 'catalog',      endpoints: ['GET /admin/catalog/readiness', 'GET /admin/catalog/exports/{channel}', 'GET /admin/catalog/exports/{channel}/validate', 'GET /admin/products', 'POST /admin/products', 'GET /admin/products/{id}', 'PUT /admin/products/{id}', 'DELETE /admin/products/{id}', 'GET /admin/products/stripe-import-preview', 'POST /admin/products/import-stripe', 'POST /admin/products/{id}/sync-stripe'] },
  { id: 'inventory',        qualifiedId: 'cedros-pay:inventory',        label: 'Inventory',       parentId: 'catalog',      endpoints: ['PUT /admin/products/{id}/inventory', 'POST /admin/products/{id}/inventory/adjust', 'GET /admin/products/{id}/inventory/adjustments', 'PUT /admin/products/{id}/variants/inventory'] },
  { id: 'subscriptions',    qualifiedId: 'cedros-pay:subscriptions',    label: 'Subscriptions',   parentId: 'catalog',      endpoints: ['GET /admin/subscriptions/settings', 'PUT /admin/subscriptions/settings'] },
  { id: 'coupons',          qualifiedId: 'cedros-pay:coupons',          label: 'Coupons',         parentId: 'catalog',      endpoints: ['GET /admin/coupons', 'POST /admin/coupons', 'PUT /admin/coupons/{id}', 'DELETE /admin/coupons/{id}'] },
  // ── Transactions ──
  { id: 'transactions',     qualifiedId: 'cedros-pay:transactions',     label: 'Transactions',    parentId: 'transactions', endpoints: ['GET /admin/transactions', 'POST /admin/stripe/refunds/{id}/process'] },
  { id: 'orders',           qualifiedId: 'cedros-pay:orders',           label: 'Orders',          parentId: 'transactions', endpoints: ['GET /admin/orders', 'GET /admin/orders/{id}'] },
  { id: 'refunds',          qualifiedId: 'cedros-pay:refunds',          label: 'Refunds',         parentId: 'transactions', endpoints: ['GET /admin/refunds', 'GET /admin/credits/refund-requests', 'GET /admin/stripe/refunds', 'POST /admin/refunds/{id}/deny'] },
  { id: 'returns',          qualifiedId: 'cedros-pay:returns',          label: 'Returns',         parentId: 'transactions', endpoints: ['GET /admin/returns', 'POST /admin/returns', 'GET /admin/returns/{id}', 'POST /admin/returns/{id}/status'] },
  { id: 'disputes',         qualifiedId: 'cedros-pay:disputes',         label: 'Disputes',        parentId: 'transactions', endpoints: ['GET /admin/disputes', 'GET /admin/disputes/{id}', 'POST /admin/disputes/{id}/status'] },
  // ── Extension Settings / Pay hub ──
  { id: 'overview',         qualifiedId: 'cedros-pay:overview',         label: 'Overview',        parentId: 'settings-hub', endpoints: ['GET /admin/subscriptions/settings', 'PUT /admin/subscriptions/settings', 'GET /admin/config/shop', 'PATCH /admin/config/shop', 'PATCH /admin/config/subscriptions'] },
  { id: 'availability',     qualifiedId: 'cedros-pay:availability',     label: 'Availability',    parentId: 'settings-hub', endpoints: ['GET /admin/config/shop', 'POST /admin/config/validate', 'PATCH /admin/config/shop'] },
  { id: 'stripe',           qualifiedId: 'cedros-pay:stripe',           label: 'Stripe',          parentId: 'settings-hub', endpoints: ['GET /admin/config/stripe', 'PUT /admin/config/stripe'] },
  { id: 'crypto',           qualifiedId: 'cedros-pay:crypto',           label: 'Crypto',          parentId: 'settings-hub', endpoints: ['GET /admin/config/x402', 'PUT /admin/config/x402'] },
  { id: 'credits',          qualifiedId: 'cedros-pay:credits',          label: 'Credits',         parentId: 'settings-hub', endpoints: ['GET /admin/config/cedros_login', 'PUT /admin/config/cedros_login'] },
  { id: 'content',          qualifiedId: 'cedros-pay:content',          label: 'Content',         parentId: 'settings-hub', endpoints: ['GET /admin/config/x402', 'GET /admin/site-settings/tipping', 'PUT /admin/site-settings/tipping', 'GET /admin/site-settings/monetization', 'PUT /admin/site-settings/monetization'] },
  { id: 'app_stores',       qualifiedId: 'cedros-pay:app_stores',       label: 'App stores',      parentId: 'settings-hub', endpoints: ['GET /admin/config/native_store', 'PUT /admin/config/native_store'] },
] as const;

function tabsForParent(parentId: string): readonly SectionTabReference[] {
  return CEDROS_PAY_SUBSECTIONS
    .filter((subsection) => subsection.parentId === parentId)
    .map((subsection) => ({
      id: subsection.id,
      qualifiedId: subsection.qualifiedId,
      label: subsection.label,
    }));
}

/**
 * Cedros Pay admin sidebar sections — what the AdminShell renders.
 *
 * JSON-safe source of truth for both the manifest projection and runtime
 * sections in `cedrosPayPlugin`.
 */
export const CEDROS_PAY_SECTIONS: readonly SectionReference[] = [
  // ── Monetization group ──
  { id: 'catalog',       qualifiedId: 'cedros-pay:catalog',       label: 'Catalog',          group: 'Monetization', order: 0, requiredPermission: 'cedros-pay:admin', tabs: tabsForParent('catalog') },
  { id: 'transactions',  qualifiedId: 'cedros-pay:transactions',  label: 'Transactions',     group: 'Monetization', order: 1, requiredPermission: 'cedros-pay:admin', tabs: tabsForParent('transactions') },
  // ── Extension-owned settings group ──
  { id: 'settings-hub',  qualifiedId: 'cedros-pay:settings-hub',  label: 'Pay hub',          group: 'Extension Settings', order: 20, requiredPermission: 'cedros-pay:admin', tabs: tabsForParent('settings-hub') },
] as const;

/** All qualified sidebar section IDs as a flat array — useful for allowlist generation */
export const CEDROS_PAY_SECTION_IDS = CEDROS_PAY_SECTIONS.map((s) => s.qualifiedId);

/** Exact JSON-safe manifest projection generated from the runtime section source. */
export const CEDROS_PAY_NAVIGATION_SECTIONS = CEDROS_PAY_SECTIONS.map((section) => ({
  id: section.qualifiedId,
  label: section.label,
  group: section.group,
  order: section.order,
  requiredPermission: section.requiredPermission,
}));

/** Group metadata shared by the runtime and its exact manifest projection. */
export const CEDROS_PAY_GROUPS = [
  { id: 'Monetization', label: 'Monetization', order: 1, defaultCollapsed: false },
  { id: 'Extension Settings', label: 'Extension Settings', order: 8, defaultCollapsed: false },
] as const;
