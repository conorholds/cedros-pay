# Cedros Pay Server Configuration

This repository supports two configuration modes:

1) Database-backed config (standalone server)
   - `src/lib.rs:560` boots from `POSTGRES_URL` (required) + `SERVER_ADDRESS` (optional)
   - Everything else is loaded from the `app_config` table for tenant `default`

2) YAML + env overrides (legacy/embedded)
   - `Config::load` reads `config/default.yaml` (optional) or an explicit YAML path

For the standalone server, YAML files are not automatically loaded.

## Standalone server (database-backed)

1. Run migrations against your Postgres database.
2. Set bootstrap environment variables:
   - `POSTGRES_URL` (or `DATABASE_URL`)
   - `SERVER_ADDRESS` (or `CEDROS_SERVER_ADDRESS`) (optional)
3. Populate per-category config in `app_config` (tenant `default`).
   Use the admin config endpoints to upsert categories/keys.

Key sections:
- `stripe`: API keys plus checkout redirect URLs. The defaults land on backend-hosted success/cancel pages (`/stripe/success`, `/stripe/cancel`) so Storybook or other static shells can finish the flow without their own routing. The webhook endpoint (`/webhook/stripe`) now serves a helpful GET page for local setup while still accepting POSTs from Stripe. **These pages are for local testing only**—override all three URLs with your own app routes and HTTPS webhook endpoint before shipping. Pair it with the Stripe CLI (`stripe listen --forward-to localhost:8080/webhook/stripe`) to forward events to your machine. For the sandbox, keep `secret_key`/`publishable_key` in their `sk_test_`/`pk_test_` forms; swap to the live pair only when deploying. Optional fields like `tax_rate_id` apply a Stripe Tax Rate when you generate ad-hoc prices (leave blank when supplying a `stripe_price_id` that already encapsulates tax).
- `server.public_url`: Public base URL used in discovery responses. Set this in production so `.well-known/payment-options` and `agent.json` advertise the correct HTTPS endpoint.
- `server.cors_allowed_origins`: Add the origins (e.g. Storybook at `http://localhost:6006`) that should be allowed to call the Cedros server during development. Leave the list empty in production and terminate CORS at your own proxy/app unless you explicitly need cross-origin access.
- `x402`: Solana wallet details. Populate `payment_address`, `token_mint`, and point `rpc_url`/`ws_url` at your provider before deploying. Adjust `skip_preflight` and `commitment` if you need different Solana confirmation semantics.
- `paywall`: Resource catalogue used by both Stripe and x402 flows. Put shared metadata (e.g. `package_id`, `credits`) under `metadata`; it is merged into Stripe sessions and the callback payload. User identity (`user_id`) should be derived server-side from the Authorization token when cedros-login is enabled; any client-supplied `user_id` metadata is ignored/overridden.
- `tenant selection`: Tenant is derived from a verified JWT claim (`tenant_id`, only when `CEDROS_JWT_SECRET` is set) or from subdomain routing; the server does not trust `X-Tenant-Id` to choose a tenant.
- `api_key`: API keys control rate limit tier; for multi-tenant deployments you can optionally bind keys to `allowed_tenants` via YAML.
- `coupons`: Coupon configuration.
- `state`: The server keeps paywall state in-memory.
- `callbacks`: Optional webhook you control; the server POSTs payment details so you can update your own database.
  Set `CALLBACK_PAYMENT_SUCCESS_URL` to override the URL at runtime and `CALLBACK_HEADER_<NAME>` to append custom headers. Leave `body` empty to receive the full JSON event, or supply `body_template` (Go `text/template`) to render custom payloads—handy for Discord’s `content` field or Slack blocks.
