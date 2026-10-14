# Cedros Pay UI style guide

Cedros Pay ships two host-loaded UI surfaces: the admin module and the public
pricing/program content block. Buyer storefront, cart, and checkout UI belong to
Cedros Shop. The retired payment SDK components and their `--cedros-*` theme are
not supported extension surfaces.

## Admin surface

The host loads [`ui/src/admin/register.ts`](../ui/src/admin/register.ts), which
returns the manifest and `cedrosPayPlugin`. The plugin mounts under this root:

```html
<div class="cedros-pay-admin cedros-data" data-extension-id="cedros-pay">
  <!-- registered admin section -->
</div>
```

Both classes are required. `cedros-pay-admin` scopes Pay styles, while
`cedros-data` supplies the host's `--cd-*` tokens. The Pay variables in
[`ui/src/admin-plugin.css`](../ui/src/admin-plugin.css) bridge to those host
tokens and provide fallbacks for isolated tests.

Admin CSS is bundled and injected once by
[`ui/src/admin/runtimeStyles.ts`](../ui/src/admin/runtimeStyles.ts). Do not add a
separate stylesheet dependency to the host or write styles outside the scoped
root. New admin components should reuse the existing `cedros-admin__*` classes
and primitives in [`ui/src/components/admin`](../ui/src/components/admin).

The established interaction rules are:

- Use host-derived color, radius, and typography tokens; do not redefine host
  `--cd-*` variables.
- Keep controls keyboard accessible and retain visible `:focus-visible` states.
- Use the shared dialog, dropdown, empty/loading, pagination, and table
  primitives before adding a new variant.
- Respect reduced-motion behavior through the existing motion boundary.
- Keep state and IO in the existing managers/services rather than in styling or
  presentation components.

The focused admin style and interaction tests live under
[`ui/src/__tests__/admin`](../ui/src/__tests__/admin).

## Site-owned pricing and program pages

Pay exposes catalog, checkout, entitlement, and program APIs. The website owns
its pricing and program routes, plan positioning, comparisons, FAQ, and theme.
Installing or upgrading Pay does not create or replace marketing pages.

Use `GET /extensions/cedros-pay/paywall/v1/subscription/plans?interval=monthly`
(or `annual`) for current purchasable plans and prices. Start checkout with
`POST /extensions/cedros-pay/paywall/v1/subscription/plan/stripe-session`, passing
`planId`, `interval` (`monthly` or `yearly`), `successUrl`, and `cancelUrl`.
Preserve authenticated credentials and the checkout idempotency key. The server
resolves the authoritative price; a website must not submit its own charge amount.
A cached display price must never enable checkout when the live catalog is unavailable.

For existing installations, migrate published pages to site-owned authored content
before upgrading from the retired `cedros-pay:pricing-programs-page` renderer.
Preserve page IDs, routes, SEO, navigation, and any pending owner drafts. Remove
extension ownership metadata only as part of that explicit content transfer.
Reinstalling Pay then leaves those pages and the merchant's catalog intact.

## Verification

From `ui/`, run:

```sh
npm run lint
npm run type-check
npm test
npm run build
npm run verify:exports
npm run verify:browser-admin
```

Use [`ui/README.md`](../ui/README.md) for component scope and the repository
[command map](command-map.md) for the complete verification sequence.
