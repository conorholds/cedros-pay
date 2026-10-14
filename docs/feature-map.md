# Cedros Pay Feature Map

Cedros Pay is a host-loaded extension. Routes and jobs come from
`server-wasm/domain`; the guest adapts host capabilities, and `hostsim` verifies
component loading and host interactions. Standalone server and payment SDK
implementations are retired.

| Area | Current implementation |
| --- | --- |
| Routes and checkout | `server-wasm/domain/src/router.rs`, `server-wasm/domain/src/checkout_contract/`, `server-wasm/domain/src/routes/` |
| Authoritative cart | `server-wasm/domain/src/versioned_cart/` |
| Usage/capacity | `server-wasm/domain/src/capacity/`, `docs/contracts/capacity-v1/` |
| Regional payment policy | `server-wasm/domain/src/regional_payment_policy.rs`, `server-wasm/domain/src/payment_availability.rs` |
| Guarded mutations | `server-wasm/domain/src/conditional_mutations.rs`, `server-wasm/domain/src/guarded_policy/` |
| Admin UI | `ui/src/admin/register.ts`, `ui/src/admin/plugin.tsx`, `ui/src/components/admin/` |
| Pricing/program data APIs | `server-wasm/domain/src/routes/`; websites own the public pages |
| Native registration | `ui/react-native/src/register.ts`; canonical manifest only |
| Declared host contract | `cedros-extension.manifest.json`, `cedros-extension.bootstrap.json` |
| Packaging and supply chain | `scripts/package-extension.mjs`, `scripts/lib/extension-package-inputs.mjs` |

Cedros Shop owns buyer storefront, cart, and checkout UX. Consumers call the
extension's supported wire contracts. The registration identifiers in
`packageFamily` remain stable for host compatibility.

For backend edits, inspect the route/job registry, domain handlers, host seams,
and relevant domain/hostsim tests. Storage belongs to the host; this repository
has no standalone PostgreSQL server or migration command. UI IO must continue
through existing managers and host services.

Use the [documentation index](README.md) to find maintained contracts and the
[command map](command-map.md) for checks. Generated `dist/`, native
`lib/`, `esm/`, `types/`, and Wasm `target/` files are not source inputs.
