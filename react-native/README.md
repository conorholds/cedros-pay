# Cedros Pay for React Native

`@cedros/pay-react-native` provides the unified Cedros payment surface for
React Native applications.

## Public entrypoints

| Entrypoint | Purpose |
| --- | --- |
| `@cedros/pay-react-native` | Native-store, subscription, policy, and provider runtime |
| `@cedros/pay-react-native/checkout` | Canonical Cedros Pay 3.0 checkout client, hook, and DTOs |
| `@cedros/pay-react-native/register` | Cedros extension-family registration metadata |

Use the dedicated checkout entrypoint for one-time checkout. Caller-owned keys
are preserved exactly and provider URLs are surfaced only after durable state
has been persisted:

```tsx
import { CedrosPayCheckout } from '@cedros/pay-react-native/checkout';

const checkout = new CedrosPayCheckout({
  serverUrl: apiOrigin,
  headers: { Authorization: `Bearer ${sessionToken}` },
});

const quote = await checkout.quote({
  idempotencyKey: quoteKey,
  attemptId: checkoutAttemptId,
  lines: [{ productId: 'standard-plan', quantity: 1 }],
  successUrl: returnUrl,
  cancelUrl,
  metadata: { extensionId: 'cedros-shop' },
});

const outcome = await checkout.checkout({
  idempotencyKey: checkoutKey,
  attemptId: checkoutAttemptId,
  quoteOperationId: quote.operationId,
  amountCents: quote.quote.totalCents,
  currency: quote.quote.currency,
  productName: 'Order',
  successUrl: returnUrl,
  cancelUrl,
});
```

`descriptor()` reads the authenticated host-derived provider scope. Caller-provided amount,
currency, product name, metadata, and cart generation are never settlement authority. They bind
the complete SDK request material, while the strict server wire receives only supported
authoritative quote and correlation fields.

Version 3 does not publish provider-specific one-time checkout components,
hooks, managers, session types, or compatibility aliases. Native-store and
subscription APIs remain on the root runtime; one-time card, x402, credits, and
cart checkout must use the canonical checkout entrypoint.

## Package verification

Before publishing, run:

```bash
npm run ci:checks
```

This lints and type-checks the source, runs the Node regression suite, builds
CommonJS/ESM/type outputs, and verifies that every declared export and runtime
translation is present in the packed artifact. It then installs the tarball in
a temporary consumer and checks CommonJS, standards-compliant Node ESM,
TypeScript `Bundler` resolution, runtime translations, and an iOS Metro bundle.
The Babel preset is ignored by Knip because this verifier references it from a
generated temporary consumer config rather than a checked-in source file.

The package publishes explicit `react-native`, `import`, `require`, and `types`
conditions. Metro receives precompiled CommonJS through the `react-native`
condition; ESM-aware tooling receives bundled, Node-resolvable ESM. As with a
standard React Native application, the host app must use the React Native Babel
preset and provide React and React Native. Because the unified root entrypoint
statically includes Stripe, Solana, and native-store surfaces, all Stripe and
Solana packages listed under `peerDependencies` are required peers; npm installs
them automatically when the host does not provide a compatible version. The
host must satisfy peer warnings when using a package manager that does not
auto-install peers. The runtime-neutral `register` entrypoint can also be
imported directly by Node tooling; the unified root
entrypoint is intended to execute inside a React Native runtime.
