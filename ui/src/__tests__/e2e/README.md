# E2E Tests

End-to-end tests for Cedros Pay React library.

## Overview

These E2E tests verify **full integration** of the library components, providers, and managers in realistic scenarios. Unlike unit tests which mock most dependencies, E2E tests use:

- ✅ Real DOM (jsdom)
- ✅ Real React Context
- ✅ Real manager instances (with mocked network calls)
- ✅ Real component rendering
- ✅ User interactions (click, type, etc.)

## Test Suites

### 1. **stripe-payment.e2e.test.tsx** (7 tests)
Tests complete Stripe payment flows:
- ✅ Button click → session creation → redirect
- ✅ Error handling (invalid products, network failures)
- ✅ Metadata and customer email passing
- ✅ Coupon code application
- ✅ Cart checkout with multiple items
- ✅ PurchaseButton auto-fallback to Stripe
- ✅ Request deduplication (prevents duplicate API calls)

**Why it matters**: Catches regressions in Stripe integration, session creation logic, and redirect handling.

### 2. **crypto-payment.e2e.test.tsx** (9 tests)
Tests complete x402 crypto payment flows:
- ✅ Wallet connection → quote → sign → verify
- ✅ Wallet connection rejection handling
- ✅ Transaction signing rejection handling
- ✅ Metadata passing to payment verification
- ✅ Coupon code application
- ✅ Cart checkout with x402
- ✅ Wallet state management (disconnected → connecting → connected → processing)
- ✅ Wallet persistence across re-renders
- ✅ Request deduplication (prevents duplicate quote requests)

**Why it matters**: Catches regressions in wallet integration, x402 protocol handling, and Solana transaction signing.

### 3. **multi-provider.e2e.test.tsx** (10 tests)
Tests critical multi-provider scenarios:
- ✅ Manager sharing (same config) - prevents duplicate Stripe.js loads
- ✅ Manager isolation (different configs) - multi-tenant security
- ✅ Wallet pool isolation - prevents cross-user wallet leakage
- ✅ Nested providers
- ✅ Memory cleanup on unmount - prevents memory leaks
- ✅ Reference counting (refCount increases/decreases correctly)
- ✅ Real-world scenarios (multi-user dashboards, admin panels)

**Why it matters**: Catches regressions in manager caching logic, memory management, and multi-tenant isolation.

## Running E2E Tests

```bash
# Run all E2E tests
npm test src/__tests__/e2e

# Run specific suite
npm test src/__tests__/e2e/stripe-payment.e2e.test.tsx
npm test src/__tests__/e2e/crypto-payment.e2e.test.tsx
npm test src/__tests__/e2e/multi-provider.e2e.test.tsx

# Run with coverage
npm run test:coverage
```

## Mock Setup

E2E tests use comprehensive mocks in `setup.ts`:

### Backend APIs
- `/health` and `/cedros-health` - Health check
- `/stripe-session` - Stripe session creation
- `/cart/checkout` - Stripe cart checkout
- `/paywall/v1/{resource}` - x402 quote (HTTP 402)
- `/verify` - x402 payment verification

### Stripe.js
- `loadStripe()` - Mocked to return mock Stripe instance
- `redirectToCheckout()` - Mocked to avoid actual redirects

### Solana Wallet
- Mock wallet adapters (Phantom, Solflare, etc.)
- Mock connection (getLatestBlockhash, sendRawTransaction, etc.)
- Mock transaction signing

## What E2E Tests Catch

### ❌ Regressions E2E Tests Prevent:

1. **Session creation broken** - Tests verify full flow from button click to redirect
2. **Metadata not passed** - Tests verify metadata reaches backend
3. **Coupon codes not applied** - Tests verify coupons in session creation
4. **Wallet connection fails** - Tests verify wallet connection flow
5. **x402 quote request wrong** - Tests verify quote request format
6. **Payment verification broken** - Tests verify payment submission
7. **Manager cache not working** - Tests verify manager sharing
8. **Memory leaks** - Tests verify cleanup on unmount
9. **Multi-tenant isolation broken** - Tests verify separate configs get separate managers
10. **Request deduplication broken** - Tests verify duplicate prevention

### ✅ Production Issues Prevented:

- **User clicks button, nothing happens** → E2E test catches missing event handlers
- **"Payment failed" with no details** → E2E test catches error handling gaps
- **Multiple Stripe.js loads slow down page** → E2E test catches manager cache failures
- **Wallet connects but payment fails** → E2E test catches x402 protocol errors
- **Cart checkout creates wrong session** → E2E test catches cart flow bugs
- **Provider unmount causes memory leak** → E2E test catches cleanup failures

## Coverage Metrics

E2E tests provide **integration coverage** that unit tests cannot:

| Component | Unit Test Coverage | E2E Test Coverage |
|-----------|-------------------|-------------------|
| `StripeButton` | ✅ Props, state, errors | ✅ Full payment flow |
| `CryptoButton` | ✅ Props, wallet state | ✅ Full x402 flow |
| `PurchaseButton` | ✅ Modal logic | ✅ Auto-fallback flow |
| `CedrosContext` | ✅ Provider setup | ✅ Multi-provider scenarios |
| `ManagerCache` | ✅ Cache logic | ✅ Real manager sharing |
| `StripeManager` | ✅ Session creation | ✅ Redirect handling |
| `X402Manager` | ✅ Quote parsing | ✅ Payment verification |

## Adding New E2E Tests

### When to add E2E tests:

1. **New payment flow** - Add test verifying complete flow
2. **New provider feature** - Add test verifying provider behavior
3. **Bug fix** - Add regression test reproducing the bug
4. **New component** - Add test verifying component integration

### Example:

```typescript
it('processes refund payment with x402', async () => {
  render(
    <CedrosProvider config={testConfig}>
      <CryptoButton
        resource="refund-123"
        label="Process Refund"
      />
    </CedrosProvider>
  );

  const button = screen.getByRole('button', { name: /process refund/i });
  const user = userEvent.setup();
  await user.click(button);

  // Verify refund quote request
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/refund-123'),
      expect.anything()
    );
  });
});
```

## Maintenance

### Updating mocks when API changes:

1. Update `setup.ts` with new endpoint
2. Update response format to match backend
3. Run E2E tests to verify

### Common mock issues:

- **"Unmocked URL" errors** → Add URL pattern to `mockBackendAPIs()`
- **Test timeout** → Increase timeout or fix async handling
- **Wallet not detected** → Check `walletDetection` mock
- **Stripe.js not loaded** → Check `loadStripe` mock

## Best Practices

✅ **Do:**
- Test complete user journeys (click → payment → success)
- Use realistic data (actual product IDs, amounts)
- Verify both success and error paths
- Clean up after each test

❌ **Don't:**
- Mock components under test (defeats E2E purpose)
- Test implementation details (use unit tests for that)
- Make actual network calls (use mocks)
- Leave state between tests

## Future Enhancements

Potential E2E test improvements:

- [ ] Add visual regression tests (screenshot comparison)
- [ ] Add performance benchmarks (time to first payment)
- [ ] Add accessibility tests (keyboard navigation, screen readers)
- [ ] Add mobile wallet adapter tests (Solana Mobile)
- [ ] Add multi-language tests (i18n flows)
- [ ] Add Storybook integration tests (visual component testing)

## Questions?

See existing tests for examples or check [Vitest documentation](https://vitest.dev/) for testing best practices.
