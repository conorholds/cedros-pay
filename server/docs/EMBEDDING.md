# Embedding cedros-pay and cedros-login Together

This guide describes how to run `cedros-pay` and `cedros-login` together, either as:
1. Two standalone microservices (HTTP integration)
2. A single Rust backend embedding both routers (single-process)

## Deployment Models

### Model 1: Microservices (Default)

```
┌─────────────────┐       HTTP        ┌──────────────────┐
│   cedros-pay    │ ───────────────▶  │  cedros-login    │
│   (port 8080)   │  JWKS + Admin API │  (port 8081)     │
└─────────────────┘                   └──────────────────┘
```

In this model:
- `cedros-pay` uses `CedrosLoginClient` to communicate with `cedros-login` over HTTP
- JWT validation uses the JWKS endpoint (`/.well-known/jwks.json`)
- Credits operations use the admin API endpoints

Configuration:
```bash
# cedros-pay
CEDROS_LOGIN_ENABLED=true
CEDROS_LOGIN_BASE_URL=http://localhost:8081
CEDROS_LOGIN_API_KEY=your-admin-api-key
```

### Model 2: Single Process (Embedded)

```
┌─────────────────────────────────────────────────┐
│              Your Application                    │
│  ┌─────────────────┐    ┌──────────────────┐    │
│  │ cedros_pay      │    │ cedros_login     │    │
│  │ Router::nest()  │    │ Router::nest()   │    │
│  └─────────────────┘    └──────────────────┘    │
└─────────────────────────────────────────────────┘
```

In this model, both crates are dependencies of your host application, and you compose their routers.

## Single-Process Embedding Guide

### Step 1: Dependencies

```toml
[dependencies]
cedros-pay = { path = "../cedros-pay/server-rust" }
cedros-login = { path = "../cedros-login/server" }
axum = "0.8"
tokio = { version = "1", features = ["full"] }
```

### Step 2: Initialize Tracing Once

**Important**: Initialize tracing in your host application only. Do not call the binary `main` functions from either crate.

```rust
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn init_tracing() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .with(tracing_subscriber::fmt::layer())
        .init();
}

#[tokio::main]
async fn main() {
    // Initialize tracing ONCE in the host app
    init_tracing();

    // ... rest of setup
}
```

### Step 3: Create Routers

```rust
use axum::Router;
use std::sync::Arc;

async fn create_app() -> Router {
    // Create cedros-login router
    let login_config = cedros_login::config::Config::from_env();
    let login_storage = cedros_login::storage::Storage::new_memory();
    let login_router = cedros_login::router_with_storage(
        login_config.clone(),
        login_storage.clone(),
        cedros_login::NoopCallback,
    );

    // Create cedros-pay router
    let pay_config = cedros_pay::Config::load().expect("config");
    let pay_store = cedros_pay::Store::new_memory();
    let pay_router = cedros_pay::router(pay_config.clone(), pay_store.clone(), None)
        .await
        .expect("router");

    // Compose into single router
    Router::new()
        .nest("/auth", login_router)
        .nest("/pay", pay_router)
}
```

### Step 4: Worker Lifecycle Coordination

Both systems have background workers. Use a shared cancellation token for coordinated shutdown.

```rust
use tokio_util::sync::CancellationToken;

async fn run_with_workers() {
    let cancel_token = CancellationToken::new();

    // Spawn cedros-login workers
    let login_storage = /* ... */;
    let login_settings = /* ... */;
    let login_workers = vec![
        cedros_login::create_withdrawal_worker(&login_config, &login_storage, login_settings.clone(), cancel_token.clone()),
        cedros_login::create_micro_batch_worker(&login_config, &login_storage, login_settings.clone(), cancel_token.clone()),
        cedros_login::create_hold_expiration_worker(&login_storage, cancel_token.clone()),
    ];

    // Spawn cedros-pay workers
    let pay_workers = cedros_pay::spawn_workers(
        &pay_config,
        pay_store.clone(),
        None, // callback
        cancel_token.clone(),
    );

    // Wait for shutdown signal
    tokio::signal::ctrl_c().await.unwrap();

    // Cancel all workers
    cancel_token.cancel();

    // Wait for workers to finish
    for handle in login_workers.into_iter().flatten() {
        let _ = handle.await;
    }
    for handle in pay_workers {
        let _ = handle.await;
    }
}
```

### Step 5: Shared Database (Optional)

If using PostgreSQL, you can share a connection pool:

```rust
use sqlx::PgPool;

let pool = PgPool::connect(&database_url).await?;

// Both systems can use the same pool
// (they use separate tables/schemas)
```

## Auth/User Association Contract

When both systems are used together, purchases and payments must be attributable to cedros-login users.

### Canonical Metadata Key: `user_id`

The `user_id` field is the canonical key for user binding in payment metadata.

- **Type**: UUID string (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
- **Source**: `sub` claim from cedros-login JWT

### JWT Contract

cedros-login issues JWTs with the following claims:

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | UUID | User ID (primary identifier) |
| `sid` | UUID | Session ID (for revocation) |
| `iss` | string | Issuer (default: `cedros-login`) |
| `aud` | string | Audience (default: `cedros-app`) |
| `exp` | timestamp | Expiration time |
| `iat` | timestamp | Issued at |

cedros-pay validates tokens using:
- RS256 algorithm with keys from JWKS endpoint
- Issuer/audience validation (if configured)
- Expiration validation

### User Binding Behavior

**Stripe Sessions**:
- When `Authorization` header contains a valid cedros-login JWT, `user_id` metadata is set from the JWT `sub` claim
- This overrides any client-supplied `user_id` (security measure)
- Stripe webhooks persist `user_id` to `payment_transactions.user_id`

**Credits Operations**:
- Hold idempotency keys are scoped by `user_id` (format: `quote:{tenant_id}:{resource}`)
- Balance checks use `user_id` from JWT
- Capture/release operations validate ownership

### Idempotency Scope

| Operation | Idempotency Key Format | Scope |
|-----------|----------------------|-------|
| Quote hold | `quote:{tenant_id}:{resource}` | Per-tenant, per-resource |
| Cart hold | `cart:{tenant_id}:{cart_id}` | Per-tenant, per-cart |
| Stripe session | `stripe:{tenant_id}:{session_id}` | Per-tenant, per-session |

## Verification Checklist

When integrating both systems, verify:

- [ ] Tracing initialized exactly once (in host app)
- [ ] Workers use shared cancellation token
- [ ] JWT issuer/audience match between systems
- [ ] `user_id` flows from JWT to payment metadata
- [ ] JWKS endpoint accessible from cedros-pay
