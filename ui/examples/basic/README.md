# Basic Cedros Pay Example

A minimal React component demonstrating the Cedros Pay UI. Use it as a starting point for your own integration or a manual smoke test against a staging backend.

## Setup

1. **Install dependencies** in the repo root:

   ```bash
   npm install
   ```

2. **Configure environment variables** in the repo root:

   ```bash
   # Copy the example config
   cp .env.example .env

   # Edit .env and add your credentials:
   # - VITE_STRIPE_PUBLIC_KEY: Your Stripe test key (pk_test_...)
   # - VITE_SERVER_URL: Your backend URL (default: http://localhost:8080)
   # - VITE_SOLANA_RPC_URL: Your Solana RPC endpoint (optional)
   ```

3. **Start the backend server** (must be running on the configured URL):

   - Backend must implement v1 API endpoints: `/paywall/v1/stripe-session`, `/paywall/v1/quote`, `/paywall/v1/verify`
   - See `API_V1_MIGRATION.md` in the root directory for the complete API spec

4. **Run the example app**:
   ```bash
   cd examples/basic
   npm run dev  # or your preferred dev server
   ```

## Configuration

All configuration is loaded from environment variables in the root `.env` file:

| Variable                 | Description                | Default                 |
| ------------------------ | -------------------------- | ----------------------- |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key     | `pk_test_placeholder`   |
| `VITE_SERVER_URL`        | Backend API URL            | `http://localhost:8080` |
| `VITE_SOLANA_CLUSTER`    | Solana network             | `mainnet-beta`          |
| `VITE_SOLANA_RPC_URL`    | Custom Solana RPC endpoint | (uses cluster default)  |

# Usage

This example demonstrates:

- Single resource payment with `resource` prop
- Success/error callbacks using the `callbacks` option group
- Theme switching with `useCedrosTheme` hook
- Content unlocking after successful payment

**API Note:** This example uses the current component API with option groups:

- `callbacks={{ onPaymentSuccess, onPaymentError }}` - Payment lifecycle handlers
- `checkout={{ customerEmail, couponCode }}` - Checkout configuration (not shown)
- `display={{ cardLabel, cryptoLabel }}` - UI customization (not shown)
- `advanced={{ wallets }}` - Advanced wallet config (not shown)

## Backend Requirements

Your backend must define a resource with ID `demo-item-id-1`:

- Price: $1.00 USD (or 1 USDC equivalent)
- Description: "Demo content access"

See [Backend Integration](https://github.com/conorholds/cedros-pay/tree/main/server) for setup.

> **Note:** This example consumes `@cedros/pay-react` as if it were published. When developing locally, configure your bundler to resolve the package name to `../../src` or rely on `npm link` / `pnpm link`.
