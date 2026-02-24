# Cedros Shop (Ecommerce UI)

Cedros Shop is a provider-agnostic storefront UI layer (catalog + cart + checkout orchestration) that plugs into Cedros Pay at a single boundary: `adapter.createCheckoutSession()`.

You import it as a namespace:

```ts
import { ecommerce } from '@cedros/pay-react';
```

## Drop in shop in ~10 minutes

1) Wrap your app (or route group) with providers:

```tsx
'use client';

import { ecommerce } from '@cedros/pay-react';

const adapter = ecommerce.createMockCommerceAdapter();

const shopConfig: ecommerce.CedrosShopConfig = {
  brand: { name: 'Cedros Shop' },
  currency: 'USD',
  checkout: {
    mode: 'minimal',
    requireEmail: true,
    allowPromoCodes: true,
    allowShipping: true,
    // Stripe recommends including a session id placeholder on success URLs.
    // Cedros Pay will pass this through to Stripe Checkout.
    successUrl: '/checkout?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: '/checkout?canceled=1',
  },
  adapter,
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ecommerce.CedrosShopProvider config={shopConfig}>
      <ecommerce.ToastProvider>
        <ecommerce.CartProvider>{children}</ecommerce.CartProvider>
      </ecommerce.ToastProvider>
    </ecommerce.CedrosShopProvider>
  );
}
```

2) Render templates (Next.js App Router examples):

```tsx
// app/shop/page.tsx
'use client';
import { ecommerce } from '@cedros/pay-react';

export default function ShopPage() {
  return <ecommerce.ShopTemplate />;
}

// app/product/[slug]/page.tsx
'use client';
import { ecommerce } from '@cedros/pay-react';

export default function ProductPage({ params }: { params: { slug: string } }) {
  return <ecommerce.ProductTemplate slug={params.slug} />;
}

// app/cart/page.tsx
'use client';
import { ecommerce } from '@cedros/pay-react';

export default function CartPage() {
  return <ecommerce.CartTemplate />;
}

// app/checkout/page.tsx
'use client';
import { ecommerce } from '@cedros/pay-react';

export default function CheckoutPage() {
  return <ecommerce.CheckoutTemplate />;
}
```

## Bring your own adapter

You implement `ecommerce.CommerceAdapter`.

Catalog + orders are up to you (Shopify/Stripe Catalog/custom DB). Checkout is the only required integration boundary.

```ts
import type { ecommerce } from '@cedros/pay-react';

export const myAdapter: ecommerce.CommerceAdapter = {
  async listProducts(params) {
    // fetch from your source
    return { items: [], page: 1, pageSize: 24 };
  },
  async getProductBySlug(slug) {
    return null;
  },
  async listCategories() {
    return [];
  },
  async getOrderHistory() {
    return [];
  },
  async createCheckoutSession(payload) {
    // SINGLE boundary: delegate to Cedros Pay or your PSP.
    // Return a redirect URL (common) or an embedded session descriptor.
    return { kind: 'redirect', url: '/checkout?status=success' };
  },
};
```

## Adapter contract tests

You can validate your adapter with a lightweight runtime checker:

```ts
import { ecommerce } from '@cedros/pay-react';

await ecommerce.validateCommerceAdapterContract(myAdapter);
```

## Use Cedros Pay as the payment boundary

If you already use Cedros Pay in your app, you can implement the checkout boundary via `useCedrosPayCheckoutAdapter()`.

```tsx
'use client';

import { CedrosProvider, ecommerce } from '@cedros/pay-react';

function AppProviders({ children }: { children: React.ReactNode }) {
  const baseAdapter = ecommerce.createMockCommerceAdapter();
  const adapter = ecommerce.useCedrosPayCheckoutAdapter(baseAdapter);

  return (
    <CedrosProvider config={{ /* your cedros-pay config */ }}>
      <ecommerce.CedrosShopProvider
        config={{
          currency: 'USD',
          checkout: { mode: 'minimal', requireEmail: true },
          adapter,
        }}
      >
        <ecommerce.ToastProvider>
          <ecommerce.CartProvider>{children}</ecommerce.CartProvider>
        </ecommerce.ToastProvider>
      </ecommerce.CedrosShopProvider>
    </CedrosProvider>
  );
}
```

## Checkout modes (fields)

- `none`: email (optional based on `requireEmail`) + payment
- `minimal`: email + name
- `shipping`: name + shipping address (and optional shipping methods)
- `full`: shipping + billing + phone + notes

## Styling requirements

These components ship Tailwind classnames (shadcn-style). Your app must have Tailwind configured.

## Payment methods UI (checkout)

The checkout page can show a payment method picker above the pay button.

`ecommerce.PaymentStep` supports multiple checkout session kinds:

- `kind: 'redirect'`: the default flow; shows a redirect hint
- `kind: 'embedded'`: pass `renderEmbedded` to render your provider UI
- `kind: 'custom'`: pass `renderCustom` to render a custom payment UI

```ts
const shopConfig: ecommerce.CedrosShopConfig = {
  currency: 'USD',
  checkout: {
    mode: 'minimal',
    requireEmail: true,
    paymentMethods: [
      { id: 'card', label: 'Card', ctaLabel: 'Pay now' },
      { id: 'crypto', label: 'Crypto', ctaLabel: 'Pay with wallet', description: 'Pay using a connected wallet.' },
    ],
  },
  adapter: myAdapter,
};
```

## Signed-in cart merge (optional)

If your adapter implements `mergeCart` / `updateCart`, the cart will merge once on mount when you provide `customer.id`.

```ts
const shopConfig: ecommerce.CedrosShopConfig = {
  currency: 'USD',
  checkout: { mode: 'minimal', requireEmail: true },
  customer: { id: 'user_123', isSignedIn: true },
  cart: { syncDebounceMs: 800 },
  adapter: myAdapter,
};
```
