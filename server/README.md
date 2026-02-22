# ⚠️ DEVELOPMENT WARNING ⚠️

**This crate is currently in active development and is NOT ready for production use.**

- **Status:** Alpha/Pre-release
- **Stability:** APIs may change without notice
- **Security:** Not yet audited for production deployment
- **Documentation:** Incomplete

**DO NOT USE THIS IN PRODUCTION ENVIRONMENTS.**

We are actively working toward a stable release. If you're interested in contributing or testing, please see the [Contributing](#contributing) section below.

---

# Cedros Pay

A Rust payment processing library and server supporting multiple payment methods including Stripe, Solana blockchain payments (x402 protocol), and traditional payment flows.

## Features

- **Multi-tenant payment processing** - Support for multiple merchants/tenants
- **Stripe integration** - Full Stripe checkout and webhook support
- **Blockchain payments** - Solana-based payments via x402 protocol
- **Cart & checkout** - Full shopping cart with inventory management
- **Subscriptions** - Recurring payment support
- **Coupons & gift cards** - Promotional code system
- **Webhook delivery** - Reliable webhook system with retries
- **Inventory management** - Stock tracking with reservations
- **Multi-currency** - Support for USD, SOL, and stablecoins

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        HTTP Layer (Axum)                     │
│  - REST API endpoints                                       │
│  - Middleware: auth, rate limiting, tenant routing          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                          │
│  - Payment processing (Stripe, x402, credits)                 │
│  - Cart & order management                                   │
│  - Subscription handling                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                         │
│  - Product & coupon management                               │
│  - Order & payment storage                                   │
│  - Caching layer (optional)                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Storage Layer                           │
│  - PostgreSQL (production)                                   │
│  - In-memory (testing)                                       │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Rust 1.75 or later
- PostgreSQL 14+ (for production use)
- Stripe account (for Stripe payments)
- Solana RPC endpoint (for blockchain payments)

### Installation

```toml
[dependencies]
cedros-pay = "1.1.1"
```

Or install the server binary:

```bash
cargo install cedros-pay
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/cedros_pay

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Solana (optional)
SOLANA_RPC_URL=https://api.devnet.solana.com
X402_SERVER_WALLET=your-wallet-private-key

# Security
API_KEY_ENCRYPTION_KEY=your-32-byte-key-here
JWT_SECRET=your-jwt-secret
```

### Running the Server

```bash
# Development
 cargo run

# Production
 cargo build --release
 ./target/release/cedros-pay-server
```

## Usage

### As a Library

```rust
use cedros_pay::{PaymentConfig, ServerBuilder};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = PaymentConfig::from_env()?;
    let server = ServerBuilder::new(config).build().await?;
    server.run().await?;
    Ok(())
}
```

### Creating a Payment

```rust
use cedros_pay::models::{PaymentRequest, Asset};

let request = PaymentRequest {
    amount: 1000, // $10.00 in cents
    asset: Asset::Usd,
    resource_id: "product-123".to_string(),
    // ... other fields
};
```

## API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `GET /discovery/agent` - AI discovery manifest
- `GET /products` - List products
- `GET /products/{id}` - Get product details
- `POST /cart` - Create shopping cart
- `POST /cart/{id}/checkout` - Checkout cart

### Admin Endpoints (require authentication)

- `GET /admin/products` - List all products
- `POST /admin/products` - Create product
- `PUT /admin/products/{id}` - Update product
- `GET /admin/orders` - List orders
- `POST /admin/coupons` - Create coupon

### Webhook Endpoints

- `POST /webhooks/stripe` - Stripe webhooks
- `POST /webhooks/x402` - x402 payment webhooks

## Database Schema

The project uses PostgreSQL with the following main tables:

- `tenants` - Multi-tenant isolation
- `products` - Product catalog
- `orders` - Order records
- `payments` - Payment transactions
- `coupons` - Promotional codes
- `inventory_reservations` - Stock reservations
- `subscriptions` - Subscription records

Run migrations:

```bash
sqlx migrate run
```

## Development

### Building

```bash
# Debug build
cargo build

# Release build
cargo build --release

# Run tests
cargo test

# Run with auto-reload (requires cargo-watch)
cargo watch -x run
```

### Testing

```bash
# All tests
cargo test

# Specific test
cargo test test_name

# With output
cargo test -- --nocapture
```

### Code Quality

```bash
# Format code
cargo fmt

# Run linter
cargo clippy -- -D warnings

# Full CI check
cargo fmt -- --check && cargo clippy && cargo test
```

## Contributing

⚠️ **Note:** We welcome contributions, but please be aware that the codebase is still evolving rapidly.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and configure
3. Run `cargo build` to verify setup
4. Run `cargo test` to ensure tests pass

## Security

- **API Keys:** All API keys are encrypted at rest
- **Webhooks:** Signature verification for all webhooks
- **Rate Limiting:** Built-in rate limiting per IP and wallet
- **Input Validation:** Strict validation on all inputs
- **SQL Injection:** Parameterized queries throughout

⚠️ **Security Notice:** This codebase has not undergone a full security audit. Use at your own risk.

## License

This project is licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE))
- MIT license ([LICENSE-MIT](LICENSE-MIT))

at your option.

## Disclaimer

**This software is provided "as is", without warranty of any kind**, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement.

**The authors and contributors are NOT responsible for:**
- Financial losses due to bugs or errors
- Security breaches or data leaks
- Failed payments or transactions
- Any damages arising from the use of this software

**Use this software at your own risk.**

## Support

For questions, issues, or discussions:
- GitHub Issues: [Report a bug](https://github.com/yourusername/cedros-pay/issues)
- Discussions: [GitHub Discussions](https://github.com/yourusername/cedros-pay/discussions)

---

**Remember: This is alpha software. Not ready for production use!** ⚠️

**Last Updated:** 2026-02-03  
**Current Version:** 1.1.1
