# @cedros/pay-react

React bindings for Cedros Pay checkout, subscriptions, credits balance, extension administration, and autosave.

Version 3 makes one-time checkout available exclusively through `@cedros/pay-react/checkout`. The root, `payments`, and `crypto-only` entrypoints do not export legacy one-time payment components, hooks, or managers.

## Install

```bash
npm install @cedros/pay-react react react-dom
```

Install the optional Solana peer dependencies only when using the Solana subscription authorization helpers.

## One-time checkout

Import the checkout SDK from its dedicated entrypoint:

```ts
import { CedrosPayCheckout } from '@cedros/pay-react/checkout';

const checkout = new CedrosPayCheckout({
  serverUrl: window.location.origin,
  headers: { Authorization: `Bearer ${sessionToken}` },
});

const quoteAttemptId = crypto.randomUUID();
const quote = await checkout.quote({
  idempotencyKey: crypto.randomUUID(),
  attemptId: quoteAttemptId,
  lines: [{ productId: 'standard-plan', quantity: 1 }],
  successUrl: `${window.location.origin}/checkout/return`,
  cancelUrl: `${window.location.origin}/cart`,
  metadata: { extensionId: 'cedros-shop' },
});
```

The quote response supplies server-owned pricing and `operationId`. Checkout binds to that quote. The amount, currency, and product name are informational correlation fields; Pay never uses them as settlement authority:

```ts
const outcome = await checkout.checkout({
  idempotencyKey: crypto.randomUUID(),
  attemptId: crypto.randomUUID(),
  quoteOperationId: quote.operationId,
  amountCents: quote.quote.totalCents,
  currency: quote.quote.currency,
  productName: 'Order',
  successUrl: `${window.location.origin}/checkout/return`,
  cancelUrl: `${window.location.origin}/cart`,
});
```

Checkout outcomes are durable lifecycle states:

- `resolved`: a durable operation exists; use status to obtain any provider action.
- `terminal`: a durably proven failure (`durable: true`).
- `indeterminate`: transport or provider certainty is unavailable; reconcile before retrying.

Creating a provider session is not payment success. Persist `action_required` first, then resolve its short-lived action and let the host decide whether to navigate:

```ts
if (outcome.status === 'resolved') {
  await persistCheckoutOutcome(outcome);
  const status = await checkout.status({ operationId: outcome.operationId, resolveProviderUrl: true });
  if (status.providerUrl?.status === 'resolved') {
    handleProviderAction(status.providerUrl.checkoutUrl);
  }
}
```

`status` accepts only provider URLs from the SDK allowlist. The SDK never navigates automatically.

Call `checkout.descriptor()` to obtain the authenticated host-derived provider scope and exact
capability constants. Applications cannot configure or author this scope.

Shop metadata, cart generation, and checkout display fields participate in the SDK's complete
request-material digest. The current strict server wire accepts only authoritative quote inputs,
so metadata and display fields are not forwarded or treated as commerce authority.

Do not log raw request bodies, return artifacts, authorization headers, provider errors, or customer identifiers. Map failures to an application-owned safe message and retain correlation identifiers only in access-controlled telemetry.

## Checkout hook

```tsx
import { useCedrosPayCheckout } from '@cedros/pay-react/checkout';

function CheckoutStatus() {
  const { checkout, state, error, reset } = useCedrosPayCheckout();
  // The hook aborts superseded work and suppresses stale or post-unmount state.
  return null;
}
```

Applications that need a custom authenticated client may pass a `CedrosPayCheckout` instance to the hook.

## Return verification

Verify the opaque return artifact against the expected attempt. Do not infer success from query parameters or the browser URL:

```ts
const verified = await checkout.verifyReturn({
  expectedAttemptId,
  returnArtifact,
});
```

## Balance and subscriptions

Balance and subscription APIs remain separate from one-time checkout:

```tsx
import {
  CedrosProvider,
  CreditsBalance,
  CreditsSubscribeButton,
  SubscribeButton,
  SubscriptionManagementPanel,
} from '@cedros/pay-react/payments';

<CedrosProvider config={cedrosConfig}>
  <CreditsBalance authToken={sessionToken} />
  <SubscribeButton resource="standard-plan" interval="monthly" />
  <CreditsSubscribeButton
    resource="standard-plan"
    interval="monthly"
    authToken={sessionToken}
    userId={accountSubject}
  />
  <SubscriptionManagementPanel resource="standard-plan" userId={accountSubject} />
</CedrosProvider>
```

The read-only credits balance manager cannot initiate, hold, or authorize a payment.

Crypto subscription, refund, and Solana authorization APIs are exported from `@cedros/pay-react/crypto-only`:

```ts
import {
  CryptoSubscribeButton,
  useCryptoSubscription,
  useRefundVerification,
  buildSolanaSubscriptionAuthorizationTransaction,
  startSolanaSubscriptionCheckout,
} from '@cedros/pay-react/crypto-only';
```

Credits and x402 subscription settlement are isolated behind subscription-only managers. Refund APIs are isolated behind a refund-only manager. None of these surfaces exports a general one-time quote, session, or verification manager.

## Other entrypoints

- `@cedros/pay-react/admin`: AdminShell plugin contract.
- `@cedros/pay-react/admin/register`: admin extension bootstrap.
- `@cedros/pay-react/web/register`: web extension bootstrap.
- `@cedros/pay-react/autosave`: autosave runtime.
- `@cedros/pay-react/telemetry`: telemetry utilities.
- `@cedros/pay-react/testing`: stable non-checkout test fixtures.

## Checkout transport guarantees

- Exact base path: `/extensions/cedros-pay`.
- No legacy-route probing or fallback.
- Caller headers are cloned; `Content-Type` and `Idempotency-Key` are reserved.
- Request timeouts and `AbortSignal` cancellation are supported.
- JSON content type and bounded response size are enforced.
- Unknown response fields and invalid lifecycle variants fail closed.
- Attempt, operation, and return correlations are checked.
- Concurrent requests deduplicate only when scope, idempotency key, and canonical request material all match.

## Development

```bash
npm install
npm run type-check
npm run lint
npm test
npm run build
npm run verify:exports
```

`verify:exports` inspects `npm pack --dry-run`, validates every export target, rejects legacy one-time checkout files and routes, and verifies that built checkout artifacts use the canonical extension routes.

## License

MIT
