# Cedros Login Invite Discount Binding

This contract covers the Cedros Pay 4 Wasm extension's subscription-selection routes.

## Consumed capability

Pay declares the optional `cedros-login:invite-discount` dependency. For an authenticated buyer, it calls the extension-mode endpoint with the buyer's bearer credential:

```http
GET /public-auth/account/invite-discount
Authorization: Bearer <cedros-login-user-token>
```

Pay performs a live lookup on every authenticated `GET /paywall/v1/subscription/plans` render and repeats it after buyer verification in `POST /paywall/v1/subscription/plan/stripe-session`. It does not cache the grant.

## Pay policy

- Duration: positive `durationMonths` applies for the first N months from subscription start. Null or absent preserves lifetime behavior. Fixed terms require one-month billing; lifetime offers allow monthly or annual billing.
- Stacking: invite wins. When a live invite grant exists, Pay does not apply a submitted Pay/Stripe promotion code.
- Binding: Pay retains the configured Stripe Price ID and applies a deterministic Stripe coupon with `duration=forever` for lifetime grants or `duration=repeating` and `duration_in_months` for fixed grants. Fixed terms have distinct coupon IDs, and fetched coupon terms must match the grant. This preserves plan, webhook, and entitlement identity. A 100% grant remains a paid-plan Stripe checkout with a zero total; it is not reclassified as a Pay free plan.
- Payment methods: invite discounts use Stripe only. Discounted plan listings omit Solana, and Solana preparation rejects a live grant. Complimentary plans remain selectable, including on annual plan queries.
- Availability: an unsupported interval returns a normal plans response with no paid offers, and `unavailableReason: invite_discount_requires_monthly_billing` when no complimentary plans remain; Stripe session creation still rejects the interval. If only incompatible payment methods exist, the reason is `invite_discount_requires_stripe`.
- Billing portal: while any subscription on the Stripe customer has an active fixed-month invite discount, Pay opens a dedicated portal configuration with plan changes disabled. Payment-method updates, invoice history, and cancellation at period end remain available. Expired and lifetime offers retain the normal portal. The account must already have an active default portal configuration before Pay creates the dedicated offer policy: Stripe makes the first configuration the default. Pay never uses a default configuration as its offer policy or creates that policy on an unconfigured account. Provider failures or malformed discount/policy data fail closed; retries recheck the current offer and cannot replay an older unrestricted session. This governs sessions created through Pay, not operator changes made directly in Stripe.
- Failure: Pay retries a Login lookup once, logs only a redacted cause, then falls back to undiscounted pricing. A Stripe failure while binding a valid grant fails checkout rather than silently discarding the promised discount.

## Response projection

The plans response adds the live grant and projects both original and adjusted prices:

```json
{
  "discount": {
    "percentOff": 50,
    "code": "GOLD50",
    "redeemedAt": "2026-07-14T18:00:00Z",
    "duration": "fixed_months",
    "durationMonths": 3,
    "billingInterval": "monthly",
    "paymentMethods": ["stripe"],
    "stacking": "invite_wins"
  },
  "plans": [{ "originalPriceCents": 2400, "priceCents": 1200 }]
}
```

`discount` is `null` without a grant or after lookup fallback. `originalPriceCents` is always present. The Stripe-session response returns the same `discount`, `originalPriceCents`, and `priceCents` projection with its session ID and URL.

## Joint release verification

Deploy Pay duration support before the Login fixed-month controls; older Pay versions interpret all grants as lifetime. Before operators distribute fixed-term codes, run the built pair in staging and record:

1. Redeem a 1–99% invite, render plans, and confirm the Stripe subscription uses the configured Price plus the lifetime invite coupon.
2. Redeem a 100% invite and confirm Stripe creates the subscription without the Pay free-plan path.
3. Confirm `{ "discount": null }` returns full price.
4. Inject two Login seam failures and confirm one retry, a redacted fallback log, and full-price checkout.
5. Submit a Pay promotion together with an invite and confirm invite-wins behavior.
6. Redeem fixed-month partial and 100% offers; verify the Stripe coupon term, monthly-only checkout, and standard-price billing after expiry using a Stripe test clock.
7. Confirm annual plan queries preserve complimentary plans and expose the monthly requirement; discounted plans must not advertise Solana.
8. Open Billing during the fixed term and verify payment methods, invoices, and cancellation remain available while plan changes are unavailable; after test-clock expiry, verify normal portal plan changes resume.
