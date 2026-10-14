# Cedros Pay Commerce SEO Contract

Cedros Pay is a commerce data provider and transactional runtime. It is not the storefront renderer. This contract is the source of truth for the SEO boundary between Pay, Shop, Core, and deployment infrastructure.

## Ownership

| Concern | Owner | Pay obligation |
| --- | --- | --- |
| Product/category HTML routes and visible content | Cedros Shop or host | Supply public, allow-listed commerce data and stable route keys |
| Canonical, hreflang, head tags, Open Graph, JSON-LD graph | Cedros Core with Shop page composition | Never emit competing head tags or guess a storefront URL |
| Sitemap URL creation and URL retirement | Core/Shop | Supply eligibility, last-modified/revision, lifecycle, and previous-slug inputs |
| API/admin/callback/webhook/feed crawler policy | Pay plus host/deployment | Classify every route and emit `X-Robots-Tag: noindex, nofollow, nosnippet` |
| Storefront HTTP status and redirects | Core/Shop/site owner | Preserve old slugs so the owner can register a redirect; Pay cannot register redirects |
| CDN host/protocol normalization and environment indexing | Deployment/Core | Never infer the public origin from a payment or callback request |

The extension authoring `seoRoutes` and `extension-seo` seams apply only to extension-owned public HTML. Pay declares neither because its manifest contributes no web route IDs and Shop owns product/category pages.

## Packaged Product Read v2

`GET /products/v1/catalog` requires `cedros-pay:product-read`. The response is a data contract, never an indexable page:

```json
{
  "contract": "cedros-pay:product-read",
  "contractVersion": 2,
  "catalogRevision": {
    "version": "opaque-host-revision",
    "lastModified": "2026-07-16T00:00:00Z"
  },
  "localization": {
    "catalogContent": "default-locale-only",
    "localizedRoutes": false,
    "hreflangOwner": "host"
  },
  "entityScope": { "kind": "site", "id": "site_123" },
  "products": [{
    "id": "prod_123",
    "publicEntityId": "cedros-pay:site:site_123:product:prod_123",
    "canonicalRouteKey": "product:prod_123",
    "slug": "trail-shoe",
    "title": "Trail shoe",
    "seoTitle": "Trail shoe | Example",
    "seoDescription": "A waterproof trail shoe.",
    "schemaEntityKind": "product",
    "commerceKind": "physical",
    "price": { "amountCents": 7999, "currency": "USD" },
    "inventoryStatus": "in_stock",
    "availability": {
      "status": "in_stock",
      "availableQuantity": 3,
      "revision": "opaque-host-revision",
      "lastModifiedUnix": 1784160000
    },
    "media": [{
      "url": "https://cdn.example/shoe.webp",
      "alt": "Blue trail shoe",
      "width": 1200,
      "height": 1200,
      "role": "primary"
    }],
    "lifecycle": {
      "state": "active",
      "indexEligible": true,
      "sitemapEligible": true,
      "publishedAt": "2026-07-01T00:00:00Z",
      "lastModified": "2026-07-16T00:00:00Z"
    },
    "purchaseAction": {
      "capabilityId": "cedros-pay:checkout",
      "routeId": "cedros-pay:checkout-create",
      "urlOwner": "host"
    }
  }]
}
```

`canonicalRouteKey` is opaque identity, not a URL. `purchaseAction` is declarative and must never be used as the canonical. The host-verified `siteId` is required and scopes every public entity ID; the content-model entry key—not a mutable payload `id`—is authoritative. Legacy records without an authored title or slug remain readable but omit the missing title, return `indexEligible: false`, `sitemapEligible: false`, and include `qualityWarnings`; internal IDs are never synthesized into public titles.

Reads scan at most 10,000 active catalog entries and fail with 422 if the bound is exceeded. Category projections are capped at 2,000 and each public product at 100 variants; an exceeded semantic bound fails the read rather than returning a complete-looking truncated catalog. Media is safely bounded to twenty items. The opaque `catalogRevision` changes atomically with catalog/category publication. Each tracked product or variant also carries an opaque `availability.revision` and `lastModifiedUnix` from authoritative checkout stock. Consumers must revalidate availability from those per-entity signals rather than cache it solely by `catalogRevision`.

## Native physical storefront policy

Pay reads platform's authoritative policy with the host-authenticated extension-service request `cedros-data:native-storefront-policy-read-v1`, route `native-storefront-policy-read`, `POST /native-storefront-policy/v1/read`, empty query and `{}` body. Contract version 1 returns `mode: physical | unrestricted` and `selectedContributionIds`. Physical mode requires the exact sorted 21 Shop page, page-template and surface IDs for shop, category, product, cart, checkout, account and purchase-history. Missing transport, errors, malformed or unknown responses fail closed with `native_storefront_policy_unavailable`; only an explicit valid unrestricted response enables unrestricted commerce.

Every product in the packaged catalog has derived `commerceKind: physical | other`. Physical requires a canonical saved standard product, `fulfillment.type: physical`, and a matching actual active `shipping_profile:<shippingProfileId>` record. Contradictory variant fulfillment, invalid/missing profile authority, cross-product payment aliases, or ambiguous recurring/token/non-fiat pricing classifies as other. Physical storefront pricing uses the same supported fiat currencies and unambiguous saved-price contract as physical catalog authoring. Stored `commerceKind`, client hints and a shipping-profile ID alone never establish physical status. The catalog remains contract version 2; this is an additive projection field. Physical-mode catalog, category counts and pagination exclude other records before projection. RAG and UCP catalog reads also exclude nonphysical records. Consumers must not treat a missing marker as physical or cache classification solely by catalog revision; shipping-profile authority and site policy are revalidated on each read.

In physical mode, canonical quote and checkout require shipping fulfillment and the Stripe rail. The same saved catalog/profile authority applies to item sources and versioned carts, replayed quotes, checkout retries and payment-URL recovery. Quote commits, initial checkout claims, and every pre-provider-attempt transition (including indeterminate retries) fence the catalog products and shipping profiles used to establish physical eligibility. Recovery also binds each saved line’s shipping profile to the current canonical product/variant profile. New versioned-cart item mutations reject nonphysical catalog goods; historical reads/removal remain possible. Legacy checkout, crypto, credits-spend, access-pass purchase, subscription creation/upgrade portals and native-IAP routes cannot initiate new storefront purchases. Previously retired APIs remain retired. Authenticated platform-capacity billing retains its separate host-verified delegation authority.

Read-only payment/order history, existing subscription cancellation, refunds, authenticated paid-return verification and provider settlement callbacks remain available so changing storefront mode cannot strand historical paid orders. Payment-URL recovery is separately revalidated because returning a provider URL can enable a new charge. Unrestricted mode retains all existing supported functionality.

## Identity And Lifecycle Rules

- New active public products require a lowercase, tenant/site-scoped slug.
- Slugs use lowercase ASCII letters, numbers, and interior dashes, with a 120-character maximum.
- Packaged create/update/delete operations serialize behind the catalog fence. Product slugs and category slugs are unique; category definitions are consistent and category parent cycles are rejected.
- A slug change retains the twenty most recent safe, unique values in `previousSlugs`. Core/Shop/site owners decide whether to issue a 301, 410, or retirement response.
- Product deletion removes the entity and atomically refreshes category state. A missing product is not permission to soft-404 it as a 200 page.
- Variant-definition mutations use the same version-fenced catalog/category publication path as full product mutations, so route/schema consumers cannot retain a stale catalog revision.
- `catalogRevision.lastModified` and product `lifecycle.lastModified` are sitemap invalidation/`lastmod` inputs, not final sitemap declarations.
- Categories authored only as identifier strings are grouping inputs, not indexable category-page declarations. Their projection omits synthetic names, slugs, and route keys. Only explicit `{id, slug, name, …}` definitions enter the category projection returned through the public product-read contract.

## Schema Input Rules

Pay supplies truthful values; Shop/Core decide whether visible page content warrants markup.

- `schemaEntityKind` distinguishes product, service, and event-offer intent. Hosts must not render every purchasable entity as a physical `Product`.
- Prices are positive integer minor units with explicit three-letter currency. Compare-at price is distinct from sale/current price. Variant public IDs are product-scoped and may carry their own SKU, price, availability, condition, and media. Tracked availability uses units available after active reservations, never raw on-hand inventory.
- Availability and condition are allow-listed. Unknown values are omitted from
  the catalog projection, never converted to `InStock` or `NewCondition`.
- Public projections reject credential-bearing, executable, malformed, or control-character media URLs even for legacy records. Media preserves authored URL, alt text, role, dimensions, and MIME type where present; hosts still resolve same-origin paths and validate final crawlability.
- Pay does not generate Organization, WebSite, BreadcrumbList, page canonicals, or final Product graphs for Shop pages.
- Shipping and return-policy schema is omitted until the contract has structured country, rate/currency, handling/transit, and reviewed policy terms. Free-form strings and starter-policy placeholders are never converted into claims.
- Ratings/reviews may be used only when genuine, moderated, visible on the page, and validated by Core/Shop.

## Canonical, Hreflang, And Sitemap Consumer Rules

Core/Shop must resolve `canonicalRouteKey + slug + site + locale` into one absolute canonical. Tracking, checkout, cart, search, sort, filter, token, callback, session, operation, success, cancel, and verification URLs are never canonicals or sitemap entries. Variant query states canonicalize according to Shop policy unless a distinct visible variant page is deliberately published.

The current packaged catalog explicitly supports default-locale content only. UI translations do not imply localized catalog content. Core/Shop must not emit product hreflang until Pay exposes authored locale variants and translation identity. A future localized contract must include locale-specific title/copy/SEO copy/slug/media, regional availability, price/currency, and an invariant product translation key.

Sitemap consumers include only active entities where `indexEligible` and `sitemapEligible` are true, and must revalidate canonical status, robots policy, tenant/site ownership, and rendered 200 status. Categories derived from identifiers, deleted/inactive products, previous slugs, transactional routes, and APIs are excluded.

## Route Crawler Policy

`ui/src/extension/serverRoutePolicies.ts` classifies the complete packaged route inventory as API, admin, callback, webhook, or feed. Every route is `noindex`; Pay owns no public HTML page or final head. Packaged server responses carry `X-Robots-Tag: noindex, nofollow, nosnippet`.

`robots.txt` remains Core/deployment-owned. It may reduce crawling but cannot replace response-level `noindex`. Assets required to render Shop pages must not inherit the API server's restrictive CSP or broad `no-store` policy.

## Required Consumer Enforcement

Core/Shop contract tests must reject duplicate canonicals, conflicting robots directives, nonreciprocal hreflang, schema URLs that differ from the canonical, sitemap entries for ineligible/noindex/redirected entities, extension head injection, and sensitive URLs marked indexable. They must snapshot initial server HTML—not hydrated DOM—to prove product content, metadata, and JSON-LD are crawlable.

The Pay test boundary proves allow-listed projection safety, slug/category
invariants, lifecycle preservation, atomic catalog fencing, route classification,
crawler headers, and manifest/source parity. Cross-package rendered HTML,
redirects, hreflang, and sitemap output remain Core/Shop responsibilities and
require sibling consumer-contract tests.
