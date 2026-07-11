import { d as P } from "./adminModules-BgSESzo7.mjs";
import { d as C, e as y, f as E, g as R, h as k, i as m, j as S, k as w, l as _, m as I, n as N, c as i, o as A, p as D, q as T, r as O, s as q, a as h, t as x, u as M, v as Y, w as U, b as V } from "./constants-DA4fMjXZ.mjs";
const B = [
  {
    id: "cedros-pay:storage",
    provider: "storage",
    displayName: "Cedros Pay Storage",
    description: "Store and retrieve product or payment-related media through a host-owned storage provider.",
    scopes: ["storage.read", "storage.write"],
    tags: ["commerce", "media"]
  },
  {
    id: "cedros-pay:email",
    provider: "email",
    displayName: "Cedros Pay Email",
    description: "Send redacted payment, order, subscription, and webhook notification emails through the host email provider.",
    scopes: ["email.send"],
    tags: ["commerce", "notifications"]
  },
  {
    id: "cedros-pay:intelligence",
    provider: "intelligence",
    displayName: "Cedros Pay Intelligence",
    description: "Generate payment and catalog assistance only through host-owned intelligence providers when AI endpoints are bound.",
    scopes: ["chat.generate"],
    tags: ["commerce", "ai"]
  },
  {
    id: "cedros-pay:blockchain-config",
    provider: "blockchain",
    displayName: "Blockchain config",
    description: "Reads site-owned wallet and Solana RPC configuration for onchain payment verification.",
    scopes: ["blockchain.config.read"],
    tags: ["commerce", "onchain"]
  }
];
function L(e, s) {
  return [
    {
      id: "cedros-pay:store-db",
      displayName: "Cedros Pay Store Data",
      description: "Read, count, write, delete, and migrate Cedros Pay commerce records through the host's validated site-database seam (database.read/count/write/delete/batch/migrate), scope-checked per call.",
      contentModels: [...e],
      migrations: [...s],
      tags: ["commerce", "payments"],
      scopes: [
        {
          verb: "read",
          resource: "Cedros Pay guarded checkout, cart, commerce, credits, subscription, webhook, audit, catalog, rollup, and compliance records",
          summary: "Read Cedros Pay runtime state through the validated database seam."
        },
        {
          verb: "count",
          resource: "Cedros Pay record counts",
          summary: "Aggregate counts server-side without fetching rows."
        },
        {
          verb: "write",
          resource: "Cedros Pay guarded checkout, cart, commerce, credits, subscription, webhook, audit, catalog, rollup, and compliance records",
          summary: "Write Cedros Pay runtime state through guarded atomic batches; policy enrollment also requires this scope."
        },
        {
          verb: "delete",
          resource: "Cedros Pay guarded checkout, cart, webhook-outbox, and processed-event records",
          summary: "Delete guarded records and retention rows atomically; setWritePolicy enrollment requires delete together with write."
        },
        {
          verb: "migrate",
          resource: "Cedros Pay content-model collections",
          summary: "Provision Cedros Pay content-model collections."
        }
      ]
    }
  ];
}
const F = [
  {
    id: "cedros-pay:customer-tags",
    displayName: "Cedros Pay Customer Tags",
    description: "Apply CRM-visible purchase lifecycle tags from Cedros Pay webhook and reconcile activity.",
    scopes: ["assign", "unassign", "read"],
    managedTagSlugs: [
      "cedros-pay:first-purchase",
      "cedros-pay:repeat-customer",
      "cedros-pay:vip-customer",
      "cedros-pay:at-risk"
    ],
    tags: ["commerce", "crm"]
  }
], G = [
  {
    id: "cedros-pay:crm-source-events",
    sourceKind: "cedros_pay",
    displayName: "Cedros Pay CRM source events",
    description: "Attach Cedros Pay purchase, subscription, refund, failure, dispute, chargeback, and reversal activity to Data CRM profiles.",
    scopes: ["write"],
    eventTypes: [
      "purchase.completed",
      "subscription.created",
      "subscription.renewed",
      "subscription.canceled",
      "credit.purchase",
      "refund.settled",
      "payment.failed",
      "payment.reversed",
      "chargeback.opened",
      "dispute.opened",
      "dispute.updated",
      "dispute.closed"
    ],
    tags: ["commerce", "crm"]
  }
], W = {
  events: [
    {
      id: C,
      displayName: "Payment Started",
      description: "A buyer started a Cedros Pay checkout or payment attempt.",
      category: "commerce",
      visibility: "public"
    },
    {
      id: y,
      displayName: "Payment Succeeded",
      description: "A Cedros Pay checkout or payment completed successfully.",
      category: "commerce",
      kind: "purchase_completion",
      visibility: "authenticated"
    },
    {
      id: E,
      displayName: "Checkout Settled",
      description: "A Cedros Pay checkout is settled; Pay may call granted ledger rails for funding or fulfillment.",
      category: "commerce",
      kind: "purchase_completion",
      visibility: "authenticated"
    },
    {
      id: R,
      displayName: "Payment Failed",
      description: "A Cedros Pay checkout or payment attempt failed with a redacted cause code.",
      category: "commerce",
      visibility: "authenticated"
    },
    {
      id: k,
      displayName: "Wallet Connected",
      description: "A buyer connected a wallet for an x402 or wallet-based Cedros Pay flow.",
      category: "commerce",
      visibility: "public"
    },
    {
      id: m,
      displayName: "Refund Settled",
      description: "A Cedros Pay refund completed against a prior checkout or subscription invoice.",
      category: "commerce",
      visibility: "admin"
    },
    {
      id: S,
      displayName: "Chargeback Opened",
      description: "A chargeback was opened against a Cedros Pay charge.",
      category: "commerce",
      visibility: "admin"
    },
    {
      id: w,
      displayName: "Payment Reversed",
      description: "A Cedros Pay payment was reversed by refund, dispute, chargeback, or manual adjustment.",
      category: "commerce",
      visibility: "admin"
    },
    {
      id: _,
      displayName: "Subscription Started",
      description: "A buyer started a recurring Cedros Pay subscription.",
      category: "commerce",
      kind: "subscription_start",
      visibility: "admin"
    },
    {
      id: I,
      displayName: "Subscription Canceled",
      description: "A recurring Cedros Pay subscription was canceled.",
      category: "commerce",
      kind: "subscription_cancellation",
      visibility: "admin"
    },
    {
      id: N,
      displayName: "Dispute Opened",
      description: "A chargeback or payment dispute was opened against a Cedros Pay charge.",
      category: "commerce",
      visibility: "admin"
    }
  ]
}, c = "1", j = "/admin/register", z = "/web/register", H = "/register";
function K(e) {
  return {
    server: {
      entrypoint: `${e.server.packageName.replace(/-/g, "_")}::register_extension_family`
    },
    admin: {
      entrypoint: `${e.react.packageName}${j}`
    },
    web: {
      entrypoint: `${e.react.packageName}${z}`
    },
    native: {
      entrypoint: `${e.reactNative.packageName}${H}`
    }
  };
}
function d(e = {}) {
  const s = r(e.nativeScreenIds ?? []), t = r(e.nativeStackIds ?? []), o = r(e.nativeProviderIds ?? []);
  return {
    server: {
      packageRef: "server",
      required: !0,
      migrations: e.serverMigrations ?? [],
      settingsSchemas: e.serverSettingsSchemas ?? [],
      contentModels: e.serverContentModels ?? [],
      routes: e.serverRoutes ?? [],
      jobs: e.serverJobs ?? [],
      events: e.serverEvents ?? []
    },
    admin: {
      packageRef: "react",
      required: !0,
      moduleIds: r(e.adminModuleIds ?? []),
      slotIds: r(e.slotIds ?? []),
      editorSurfaceIds: r(e.editorSurfaceIds ?? [])
    },
    web: {
      packageRef: "react",
      required: !0,
      routeIds: r(e.routeIds ?? []),
      blockTypes: r(e.blockTypes ?? []),
      templateIds: r(e.templateIds ?? []),
      authoredSurfaceIds: r(e.authoredSurfaceIds ?? []),
      templateUtilityIds: r(e.templateUtilityIds ?? [])
    },
    native: {
      packageRef: "reactNative",
      required: !0,
      screenIds: s,
      stackIds: t,
      providerIds: o
    }
  };
}
function r(e) {
  return Array.from(new Set(e));
}
const X = [
  {
    id: A,
    displayName: "Configure Payments",
    moduleId: i,
    sectionId: "cedros-pay:settings-hub",
    description: "Inspect payment configuration and host availability gates."
  }
], n = [
  "cedros-pay:subscription-selection-status",
  "cedros-pay:subscription-plans",
  "cedros-pay:subscription-plan-solana-subscription",
  "cedros-pay:compliance-check",
  "cedros-pay:refunds-get",
  "cedros-pay:purchases",
  "cedros-pay:admin",
  "cedros-pay:admin-stats",
  "cedros-pay:admin-commerce-analytics",
  "cedros-pay:admin-commerce-analytics-recover",
  "cedros-pay:admin-transactions-list",
  "cedros-pay:admin-orders-list",
  "cedros-pay:admin-orders-get",
  "cedros-pay:admin-returns-list",
  "cedros-pay:admin-returns-get",
  "cedros-pay:admin-returns-status-update",
  "cedros-pay:admin-disputes-list",
  "cedros-pay:admin-disputes-get",
  "cedros-pay:admin-disputes-status-update",
  "cedros-pay:admin-catalog-readiness",
  "cedros-pay:admin-catalog-export",
  "cedros-pay:admin-catalog-export-validate",
  "cedros-pay:admin-catalog-seo-republish",
  "cedros-pay:admin-products-list",
  "cedros-pay:admin-products-create",
  "cedros-pay:admin-products-get",
  "cedros-pay:admin-products-update",
  "cedros-pay:admin-products-delete",
  "cedros-pay:admin-products-stripe-import-preview",
  "cedros-pay:admin-products-stripe-import",
  "cedros-pay:admin-products-stripe-sync",
  "cedros-pay:admin-product-inventory-set",
  "cedros-pay:admin-product-inventory-adjust",
  "cedros-pay:admin-product-inventory-adjustments",
  "cedros-pay:admin-product-variations-get",
  "cedros-pay:admin-product-variations-update",
  "cedros-pay:admin-product-variant-inventory-update",
  "cedros-pay:admin-coupons-list",
  "cedros-pay:admin-coupons-create",
  "cedros-pay:admin-coupons-update",
  "cedros-pay:admin-coupons-delete",
  "cedros-pay:admin-subscriptions-settings-get",
  "cedros-pay:admin-subscriptions-settings-update",
  "cedros-pay:admin-refunds-list",
  "cedros-pay:admin-credit-refund-requests-list",
  "cedros-pay:admin-stripe-refunds-list",
  "cedros-pay:admin-affiliate-payouts-settle",
  "cedros-pay:subscriptions-status",
  "cedros-pay:stats",
  "cedros-pay:credits-balance",
  "cedros-pay:payments",
  "cedros-pay:product-rag-records",
  "cedros-pay:product-read",
  "cedros-pay:product-create",
  "cedros-pay:entitlements",
  "cedros-pay:subscription-entitlements",
  "cedros-pay:admin-config-list",
  "cedros-pay:admin-config-history",
  "cedros-pay:admin-config-validate",
  "cedros-pay:admin-config-stripe-get",
  "cedros-pay:admin-config-stripe-update",
  "cedros-pay:admin-config-x402-get",
  "cedros-pay:admin-config-x402-update",
  "cedros-pay:admin-config-cedros-login-get",
  "cedros-pay:admin-config-cedros-login-update",
  "cedros-pay:admin-config-native-store-get",
  "cedros-pay:admin-config-native-store-update",
  "cedros-pay:admin-config-shop-get",
  "cedros-pay:admin-config-shop-update",
  "cedros-pay:admin-config-subscriptions-get",
  "cedros-pay:admin-config-subscriptions-update",
  "cedros-pay:admin-shipping-profiles-list",
  "cedros-pay:admin-shipping-profiles-create",
  "cedros-pay:admin-shipping-profiles-get",
  "cedros-pay:admin-shipping-profiles-update",
  "cedros-pay:admin-shipping-profiles-delete",
  "cedros-pay:admin-shipping-rates-list",
  "cedros-pay:admin-shipping-rates-create",
  "cedros-pay:admin-shipping-rates-update",
  "cedros-pay:admin-shipping-rates-delete",
  "cedros-pay:admin-tax-rates-list",
  "cedros-pay:admin-tax-rates-create",
  "cedros-pay:admin-tax-rates-get",
  "cedros-pay:admin-tax-rates-update",
  "cedros-pay:admin-tax-rates-delete",
  "cedros-pay:admin-site-settings-tipping-get",
  "cedros-pay:admin-site-settings-tipping-update",
  "cedros-pay:admin-site-settings-monetization-get",
  "cedros-pay:admin-site-settings-monetization-update",
  "cedros-pay:admin-refunds-deny",
  "cedros-pay:admin-stripe-refunds-process",
  "cedros-pay:guarded-policy-enroll",
  "cedros-pay:native-store-apple-notification",
  "cedros-pay:native-store-google-notification",
  "cedros-pay:native-store-verify",
  "cedros-pay:refunds-request",
  "cedros-pay:subscription-free-selection",
  "cedros-pay:subscription-plan-stripe-session",
  "cedros-pay:subscription-solana-subscription-activate",
  "cedros-pay:subscription-stripe-session",
  "cedros-pay:subscriptions-cancel",
  "cedros-pay:subscriptions-create",
  "cedros-pay:subscriptions-portal",
  "cedros-pay:webhooks",
  "cedros-pay:checkout-descriptor",
  "cedros-pay:checkout-quote",
  "cedros-pay:checkout-create",
  "cedros-pay:checkout-status",
  "cedros-pay:checkout-resolve",
  "cedros-pay:checkout-return-verify",
  "cedros-pay:versioned-cart-open",
  "cedros-pay:versioned-cart-read",
  "cedros-pay:versioned-cart-rotate",
  "cedros-pay:versioned-cart-apply"
], $ = {
  products: [],
  notifications: [
    {
      id: "cedros-pay:purchase-completed-team-notification",
      displayName: "Purchase completed notification",
      title: "Purchase completed",
      description: "Requests a team notification route when Cedros Pay completes a purchase.",
      eventId: y,
      audience: "team",
      severity: "info",
      defaultChannels: ["email"],
      subjectTemplate: "Cedros Pay purchase completed",
      bodyTemplate: "A Cedros Pay purchase completed. Review payment activity in Cedros Data.",
      tags: ["commerce", "purchases", "notifications"]
    },
    {
      id: "cedros-pay:refund-settled-team-notification",
      displayName: "Refund settled notification",
      title: "Refund settled",
      description: "Requests a team notification route when Cedros Pay settles a refund.",
      eventId: m,
      audience: "team",
      severity: "info",
      defaultChannels: ["email"],
      subjectTemplate: "Cedros Pay refund settled",
      bodyTemplate: "A Cedros Pay refund settled. Review refund activity in Cedros Data.",
      tags: ["commerce", "refunds", "notifications"]
    }
  ]
}, J = [
  "## Refund & Returns Policy",
  "",
  "Owner review required: this starter policy is not legal advice. Replace every placeholder with your business-specific terms before publishing.",
  "",
  "### Refund window",
  "",
  "Customers may request a refund within [REFUND WINDOW, e.g. 14 days] after purchase or delivery. Requests outside this window are reviewed only when required by applicable rules or an owner-approved exception.",
  "",
  "### Eligible purchases",
  "",
  "Refunds may be available for [ELIGIBLE PURCHASE TYPES], including duplicate charges, failed checkout fulfillment, or products that arrive materially different from the approved order details.",
  "",
  "### Ineligible purchases",
  "",
  "Refunds are generally not available for [INELIGIBLE PURCHASE TYPES], including completed custom work, final-sale items, misuse, or purchases that cannot be verified with an order reference.",
  "",
  "### Return condition",
  "",
  "Returned physical goods must be [RETURN CONDITION, e.g. unused, in original packaging, with accessories included] unless the item arrived damaged or applicable rules require another outcome.",
  "",
  "### Digital goods",
  "",
  "Digital goods, downloads, API credits, wallet-based access, and paywalled content are [DIGITAL GOODS TERMS, e.g. non-refundable once delivered or accessed] except where required by law or owner-approved policy.",
  "",
  "### Subscriptions",
  "",
  "Subscription cancellations stop future renewals. Refunds for current or prior subscription periods follow [SUBSCRIPTION REFUND TERMS], including any trial, partial-period, or usage-based rules.",
  "",
  "### Processing time",
  "",
  "Approved refunds are submitted within [PROCESSING TIME, e.g. 5-10 business days]. Banks, card networks, wallets, and payment providers may take additional time to post funds.",
  "",
  "### Shipping and restocking",
  "",
  "If returns require shipping, state who pays return shipping, whether original shipping is refundable, and whether any [RESTOCKING FEE] applies. Do not charge shipping or restocking fees unless the site owner has approved them.",
  "",
  "### Support contact",
  "",
  "To request help, contact [SUPPORT CONTACT EMAIL OR FORM URL] with your order reference, purchase date, item or plan name, and the reason for the request."
].join(`
`), Q = [
  {
    id: T,
    displayName: "Checkout Form",
    title: "Checkout Form",
    description: "Owner-editable checkout intake form for purchase and payment requests.",
    defaultKey: "checkout",
    status: "active",
    scope: "contact",
    submitLabel: "Submit checkout request",
    successTitle: "Checkout request received",
    successMessage: "We received your checkout request. The site owner will follow up with payment details.",
    fields: [
      { key: "name", label: "Name", type: "text", required: !0, placeholder: "Your name" },
      { key: "email", label: "Email", type: "email", required: !0, placeholder: "you@example.com" },
      { key: "item", label: "Item or plan", type: "text", required: !0, placeholder: "Product, service, or plan name" },
      { key: "quantity", label: "Quantity", type: "text", required: !1, placeholder: "1" },
      { key: "notes", label: "Checkout notes", type: "textarea", required: !1, placeholder: "Add sizing, delivery, or billing details." },
      {
        key: "checkout_consent",
        label: "I consent to this site using my submitted details to prepare this checkout.",
        type: "checkbox",
        required: !0,
        helpText: "The site owner should review this consent text before publishing."
      }
    ]
  },
  {
    id: O,
    displayName: "Refund Form",
    title: "Refund Form",
    description: "Owner-editable refund request form for prior Cedros Pay purchases.",
    defaultKey: "refund",
    status: "active",
    scope: "contact",
    submitLabel: "Submit refund request",
    successTitle: "Refund request received",
    successMessage: "We received your refund request. The site owner will review it against the refund policy.",
    fields: [
      { key: "name", label: "Name", type: "text", required: !0, placeholder: "Your name" },
      { key: "email", label: "Email", type: "email", required: !0, placeholder: "you@example.com" },
      { key: "order_reference", label: "Order reference", type: "text", required: !0, placeholder: "Order, invoice, or receipt reference" },
      {
        key: "refund_reason",
        label: "Refund reason",
        type: "select",
        required: !0,
        options: [
          { label: "Duplicate charge", value: "duplicate_charge" },
          { label: "Order not fulfilled", value: "order_not_fulfilled" },
          { label: "Wrong item or plan", value: "wrong_item_or_plan" },
          { label: "Canceled subscription", value: "canceled_subscription" },
          { label: "Other", value: "other" }
        ]
      },
      { key: "details", label: "Refund details", type: "textarea", required: !0, placeholder: "Describe the purchase and requested refund." },
      {
        key: "refund_consent",
        label: "I consent to this site using my submitted details to review this refund request.",
        type: "checkbox",
        required: !0,
        helpText: "The site owner should review this consent text before publishing."
      }
    ]
  }
], Z = [], ee = [
  {
    id: D,
    kind: "refund-returns-policy",
    displayName: "Refund & Returns Policy",
    title: "Refund & Returns Policy",
    slug: "refund-returns",
    routePath: "/refund-returns",
    footerLabel: "Refund & Returns Policy",
    excerpt: "Owner-reviewed refund and return rules for Cedros Pay checkout.",
    bodyMarkdown: J,
    category: "legal",
    tags: ["refunds", "returns", "payments"],
    seo: {
      title: "Refund & Returns Policy",
      description: "Owner-reviewed refund and return rules for Cedros Pay checkout.",
      canonicalPath: "/refund-returns",
      ogTitle: "Refund & Returns Policy",
      ogDescription: "Review refund, return, subscription, digital goods, and support terms for Cedros Pay checkout.",
      noindex: !0
    }
  }
], re = [
  a("cedros-pay:schedule-sanctions-refresh", "cedros-pay:sanctions-refresh", "Sanctions refresh", "15 2 * * *", 300, 3, {}),
  a("cedros-pay:schedule-sanctions-sweep", "cedros-pay:sanctions-sweep", "Sanctions sweep", "45 2 * * *", 600, 2, { dryRun: !1 }),
  a("cedros-pay:schedule-balance-alert", "cedros-pay:balance-alert", "Balance alert", "0 * * * *", 120, 2, {}),
  a("cedros-pay:schedule-health-check", "cedros-pay:health-check", "Health check", "*/5 * * * *", 60, 1, { includeProviders: !0 }),
  a("cedros-pay:schedule-cleanup", "cedros-pay:cleanup", "Cleanup", "*/5 * * * *", 600, 2, { dryRun: !1 }, !0),
  a("cedros-pay:schedule-email", "cedros-pay:email", "Email queue", "* * * * *", 120, 3, { batchSize: 25 }),
  a("cedros-pay:schedule-stats-rollup", "cedros-pay:stats-rollup", "Stats rollup", "30 0 * * *", 120, 2, { day: "" }),
  a("cedros-pay:schedule-subscription-sync", "cedros-pay:subscription-sync", "Subscription sync", "*/15 * * * *", 300, 3, { limit: 100 }),
  a("cedros-pay:schedule-webhook-delivery", "cedros-pay:webhook-delivery", "Webhook delivery", "* * * * *", 120, 3, { batchSize: 25 }, !0),
  a("cedros-pay:schedule-x402-reconcile", "cedros-pay:x402-reconcile", "x402 reconcile", "*/5 * * * *", 180, 3, { limit: 100 })
];
function ae() {
  return re.map((e) => ({
    ...e,
    concurrency: e.concurrency ? { ...e.concurrency } : void 0,
    metadata: e.metadata ? { ...e.metadata } : void 0
  }));
}
function a(e, s, t, o, g, b, f, v = !1) {
  return {
    id: e,
    jobId: s,
    label: t,
    enabled: v,
    cron: o,
    timeoutSeconds: g,
    maxRetries: b,
    concurrency: { mode: "single-flight", scope: "site" },
    metadata: f
  };
}
const p = {
  server: {
    packageName: "cedros-pay",
    version: x,
    required: !0
  },
  react: {
    packageName: "@cedros/pay-react",
    version: h,
    required: !0
  },
  reactNative: {
    packageName: "@cedros/pay-react-native",
    version: q,
    required: !0
  }
}, se = {
  packageRef: "server",
  skills: [
    {
      id: "cedros-pay:checkout",
      name: "Checkout",
      description: "Use canonical authoritative quotes, checkout attempts, and versioned carts after guarded activation.",
      category: "commerce",
      visibility: "public",
      docs: {
        markdown: "## Checkout\n\nUse the canonical `/extensions/cedros-pay/checkout*` routes for authoritative quote and checkout operations and `/extensions/cedros-pay/cart/*` for authenticated versioned-cart synchronization. These operations fail closed until Cedros Data 0.1.9+ proves the exact fourteen-model guarded-policy marker. No legacy one-time checkout aliases are published. Detailed guide: `{{API_BASE}}/skills/checkout`."
      }
    },
    {
      id: "cedros-pay:subscriptions",
      name: "Subscriptions",
      description: "Manage recurring billing flows for authenticated users.",
      category: "billing",
      visibility: "authenticated",
      docs: {
        markdown: "## Subscriptions\n\nUse the `/extensions/cedros-pay/subscription/v1/*` routes with bearer auth to inspect, create, and cancel Cedros Pay subscriptions. Detailed guide: `{{API_BASE}}/skills/subscriptions`."
      }
    },
    {
      id: "cedros-pay:admin",
      name: "Admin",
      description: "Run authenticated Cedros Pay admin workflows for commerce operations.",
      category: "admin",
      visibility: "admin",
      docs: {
        markdown: "## Admin\n\nUse Cedros Pay admin APIs for payment configuration, products/catalog, orders, shipping, tax, subscriptions, refunds, invoices, checkout state, and operational billing workflows with admin authentication. Customer/person profiles live in Cedros Data CRM. Detailed guide: `{{API_BASE}}/skills/admin`."
      }
    }
  ]
}, u = [
  "cedros-pay:cart",
  "cedros-pay:catalog",
  "cedros-pay:checkout-inventory-holds",
  "cedros-pay:checkout-operations",
  "cedros-pay:checkout-return-index",
  "cedros-pay:checkout-stock",
  "cedros-pay:commerce-ledger",
  "cedros-pay:compliance-assets",
  "cedros-pay:credits",
  "cedros-pay:customer-cart-generations",
  "cedros-pay:customer-cart-lanes",
  "cedros-pay:customer-cart-operations",
  "cedros-pay:customer-cart-tombstones",
  "cedros-pay:customer-carts",
  "cedros-pay:guarded-write-policy-state",
  "cedros-pay:settings-audit",
  "cedros-pay:stats-rollup",
  "cedros-pay:subscriptions",
  "cedros-pay:support-ai",
  "cedros-pay:webhook-outbox"
], l = [
  "cedros-pay:core-schema-v1",
  "cedros-pay:catalog-v1",
  "cedros-pay:orders-fulfillment-v1",
  "cedros-pay:subscription-billing-v1",
  "cedros-pay:webhook-outbox-v1",
  "cedros-pay:settings-audit-v1",
  "cedros-pay:support-ai-v1",
  "cedros-pay:compliance-assets-v1",
  "cedros-pay:performance-indexes-v1",
  "cedros-pay:credits-v1",
  "cedros-pay:stats-rollup-v1",
  "cedros-pay:cart-v1"
], te = [
  "cedros-pay:payment-settings",
  "cedros-pay:store-settings",
  "cedros-pay:automation-settings",
  "cedros-pay:site_settings/tipping",
  "cedros-pay:site_settings/monetization"
], oe = [], ie = ["cedros-data:database-concurrency-v1"], ne = {
  schemaVersion: 1,
  extensionId: V,
  displayName: U,
  version: h,
  description: Y,
  compatibility: {
    platformApiVersion: c,
    minCedrosDataVersion: M
  },
  platformApiVersion: c,
  packageFamily: p,
  dependencies: {
    extensions: [
      {
        extensionId: "cedros-login",
        minVersion: "0.0.55",
        required: !1,
        reason: "Enables protected Cedros Pay admin and user-context workflows; those routes fail closed when Login is unavailable."
      },
      {
        extensionId: "cedros-notifications",
        minVersion: "0.1.9",
        required: !1,
        reason: "Enables published notification route setup seeds for Cedros Pay payment and refund events."
      },
      {
        extensionId: "cedros-balance",
        required: !1,
        reason: "Enables read-only Balance inspection now and future payment mutations after host conditional transactions are available and adopted."
      }
    ],
    capabilities: [
      {
        capabilityId: "cedros-login:admin-auth",
        required: !1,
        reason: "Runtime integration for Cedros Pay admin/operator authorization; protected admin routes fail closed without it."
      },
      {
        capabilityId: "cedros-login:user-context",
        required: !1,
        reason: "Runtime integration for authenticated checkout, subscription, credits, and compliance workflows; protected routes fail closed without it."
      },
      {
        capabilityId: "cedros-notifications:route-write",
        required: !1,
        reason: "Enables owner-configurable notification routes for declared Cedros Pay server events."
      },
      {
        capabilityId: "cedros-balance:balance-read",
        required: !1,
        reason: "Allows read-only Balance inspection. Credit, debit, hold, capture, and release stay unavailable until the host provides conditional database transactions."
      },
      {
        capabilityId: "cedros-data:database-concurrency-v1",
        required: !0,
        reason: "Required for schema-v1 guarded database batches, guarded-only policy enforcement, and atomic authoritative category SEO snapshot publication."
      }
    ]
  },
  surfaces: {
    ...d({
      adminModuleIds: [i],
      serverRoutes: [...n],
      serverJobs: [
        "cedros-pay:sanctions-refresh",
        "cedros-pay:sanctions-sweep",
        "cedros-pay:balance-alert",
        "cedros-pay:health-check",
        "cedros-pay:cleanup",
        "cedros-pay:email",
        "cedros-pay:stats-rollup",
        "cedros-pay:subscription-sync",
        "cedros-pay:webhook-delivery",
        "cedros-pay:x402-reconcile"
      ]
    }),
    server: {
      ...d({
        adminModuleIds: [i]
      }).server,
      contentModels: [...u],
      migrations: [...l],
      settingsSchemas: [...te],
      routes: [...n],
      jobs: [
        "cedros-pay:sanctions-refresh",
        "cedros-pay:sanctions-sweep",
        "cedros-pay:balance-alert",
        "cedros-pay:health-check",
        "cedros-pay:cleanup",
        "cedros-pay:email",
        "cedros-pay:stats-rollup",
        "cedros-pay:subscription-sync",
        "cedros-pay:webhook-delivery",
        "cedros-pay:x402-reconcile"
      ],
      events: [
        "cedros-pay:payment-succeeded",
        "cedros-pay:checkout-settled",
        "cedros-pay:payment-failed",
        "cedros-pay:refund-settled",
        "cedros-pay:chargeback-opened",
        "cedros-pay:payment-reversed",
        "cedros-pay:entitlement-changed",
        "cedros-pay:subscription-started",
        "cedros-pay:subscription-canceled",
        "cedros-pay:dispute-opened"
      ]
    },
    ai: se
  },
  registration: K(p),
  adminModules: P,
  contentBlocks: [],
  contentTemplates: [],
  authoredSurfaces: [],
  pageSeeds: [],
  formTemplates: Q,
  docsArticles: Z,
  policies: ee,
  capabilities: [
    {
      id: "cedros-pay:admin",
      displayName: "Cedros Pay Admin",
      description: "Manage Cedros Pay commerce configuration, catalog, orders, shipping, tax, and operations.",
      category: "admin",
      requestedScopes: [
        {
          verb: "read",
          resource: "cedros-pay admin operations",
          summary: "Review Cedros Pay configuration, payments, catalog, orders, subscriptions, shipping, tax, and store operations."
        },
        {
          verb: "write",
          resource: "cedros-pay admin operations",
          summary: "Manage Cedros Pay configuration, catalog, orders, shipping, tax, refunds, and subscriptions."
        }
      ]
    },
    {
      id: "cedros-pay:balance-read",
      displayName: "Cedros Pay Balance Read",
      description: "Read-only Cedros Balance summary (gross, net, refunds, currency, time-series) via the cedros-pay:stats route.",
      category: "commerce",
      requestedScopes: [
        {
          verb: "read",
          resource: "Cedros Balance summary",
          summary: "Read operator-aggregate Cedros Balance summary; never returns buyer identifiers or ledger rows."
        }
      ]
    },
    {
      id: "cedros-pay:subscription-read",
      displayName: "Cedros Pay Subscription Read",
      description: "Read-only subscription metrics plus per-subscription managed-service entitlements for trusted host integrations.",
      category: "commerce",
      requestedScopes: [
        {
          verb: "read",
          resource: "cedros-pay subscription metrics and managed-service entitlements",
          summary: "Read aggregate subscription metrics and the managedProviderLimits entitlement projection for a specific subscription; excludes payment credentials, provider secrets, wallet data, and product metadata."
        }
      ]
    },
    {
      id: "cedros-pay:product-rag-records",
      displayName: "Cedros Pay Product RAG Records",
      description: "Publish support-safe live product records for Data's products RAG source.",
      category: "commerce",
      requestedScopes: [
        {
          verb: "read",
          resource: "cedros-pay support-safe product RAG records",
          summary: "Read public/operator-approved product facts for chat grounding; excludes private buyer and purchase data."
        }
      ]
    },
    {
      id: "cedros-pay:product-read",
      displayName: "Cedros Pay Product Read",
      description: "Read Pay-backed storefront catalog products and derived categories for Shop rendering.",
      category: "commerce",
      requestedScopes: [
        {
          verb: "read",
          resource: "cedros-pay storefront catalog products and derived categories",
          summary: "Read public active product/category data for storefront pages; excludes metadata, buyer, payment, wallet, provider, token, and secret data."
        }
      ]
    },
    {
      id: "cedros-pay:product-create",
      displayName: "Cedros Pay Product Create",
      description: "Create Pay-backed catalog products from trusted host surfaces such as booking and admin flows.",
      category: "commerce",
      requestedScopes: [
        {
          verb: "write",
          resource: "cedros-pay catalog product records",
          summary: "Create purchasable catalog products with bounded public fields (title, price, copy, media, categorization); cannot read or modify buyer, payment, wallet, provider, token, or secret data."
        }
      ]
    },
    {
      id: "cedros-pay:entitlement-read",
      displayName: "Cedros Pay Entitlement Read",
      description: "Check Pay-owned purchase and subscription entitlement state for Data gated media.",
      category: "commerce",
      requestedScopes: [
        {
          verb: "read",
          resource: "cedros-pay media entitlement checks",
          summary: "Return boolean entitlement decisions for Data gated-media checks without payment, provider, wallet, or buyer profile details."
        }
      ]
    },
    {
      id: "cedros-pay-checkout",
      displayName: "Cedros Pay Checkout",
      description: "Canonical authoritative quote and checkout operations for Cedros Shop 3 consumers.",
      category: "commerce",
      active: !0,
      registered: !0,
      requestedScopes: [
        {
          verb: "invoke",
          resource: "cedros-pay-checkout:quote",
          summary: "Create and replay authoritative, scope-isolated checkout quotes."
        },
        {
          verb: "invoke",
          resource: "cedros-pay-checkout:checkout",
          summary: "Create, resolve, inspect, and verify one durably correlated checkout attempt."
        }
      ]
    },
    {
      id: "cedros-pay:versioned-cart-write-v1",
      displayName: "Cedros Pay Versioned Cart Write",
      description: "Authoritative customer-cart synchronization with generation fencing and durable idempotent mutation replay.",
      category: "commerce",
      active: !0,
      registered: !0,
      requestedScopes: [
        {
          verb: "read",
          resource: "authenticated buyer authoritative cart",
          summary: "Open or read the current server-owned cart generation and authoritative cart state."
        },
        {
          verb: "write",
          resource: "authenticated buyer authoritative cart",
          summary: "Rotate a customer generation or apply one version-guarded, idempotency-bound cart mutation."
        }
      ]
    },
    {
      id: "cedros-pay:site-brain-records",
      displayName: "Cedros Pay Site Brain Records",
      description: "Emit redacted operational records for setup, automation, compliance, messaging, and maintenance.",
      category: "runtime",
      requestedScopes: [
        {
          verb: "write",
          resource: "site-brain-record:setup",
          summary: "Publish redacted setup completion records."
        },
        {
          verb: "write",
          resource: "site-brain-record:automation",
          summary: "Publish redacted automation job outcome records."
        },
        {
          verb: "write",
          resource: "site-brain-record:compliance",
          summary: "Publish redacted compliance sweep records."
        },
        {
          verb: "write",
          resource: "site-brain-record:maintenance",
          summary: "Publish redacted retention and cleanup records."
        },
        {
          verb: "write",
          resource: "site-brain-record:messaging",
          summary: "Publish redacted email queue records."
        }
      ]
    }
  ],
  analytics: W,
  jobSchedules: ae(),
  setupSeeds: $,
  providerAccess: B,
  databaseAccess: L(u, l),
  customerTagAccess: F,
  crmSourceAccess: G,
  requiredServices: [...oe],
  requiredCapabilities: [...ie],
  onboardingPages: X
};
export {
  ne as c
};
