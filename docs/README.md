# Cedros Pay documentation

The manifest and executable source are authoritative. These documents explain the
extension architecture and the wire contracts that other Cedros components
consume. Start with the source maps below, then follow the contract for the
workflow you are integrating.

## Start here

- [Repository README](../README.md): purpose, layout, prerequisites, and common commands.
- [Feature map](feature-map.md): current ownership and source entry points.
- [Command map](command-map.md): affected-scope development and release checks.
- [Contributor instructions](../AGENTS.md): change scope, verification, and review.
- [UI style guide](extension-ui-style-guide.md): current admin and pricing/program surfaces.

## Runtime and integration contracts

- [Canonical checkout](cedros-pay-checkout-contract.md) and
  [settlement effects](canonical-settlement-effects.md)
- [Financial state ownership and invariants](financial-state-invariants.md)
- [Versioned customer carts](versioned-cart-write-v1.md)
- [Guarded database batches](cedros-data-conditional-batch-handoff.md)
- [Invite discounts](cedros-login-invite-discount-binding.md)
- [Commerce SEO](seo-commerce-contract.md)
- [Admin autosave](autosave.md)
- [Usage/capacity v1](contracts/capacity-v1/portal-usage-capacity-v1.md) and
  [Pay integration guide](contracts/capacity-v1/IMPLEMENTATION.md)

JSON files beside these documents are machine-readable contracts, provenance,
inventories, or fixtures consumed by validators and tests. Keep prose and machine
artifacts aligned when changing a contract. The capacity standard and its
fixtures are pinned upstream inputs; the Pay integration guide describes the
local adapter and configuration requirements.

Release state is recorded outside this directory in
[`cedros-extension.release-readiness.json`](../cedros-extension.release-readiness.json).
Repository verification does not by itself prove a live host or provider deployment.
