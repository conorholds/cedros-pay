# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.18] - 2026-02-23

### Fixed
- Fixed persistent "unsaved" indicator on config settings pages caused by infinite save loop

## [1.1.17] - 2026-02-22

### Added
- Subscription support with `SubscribeButton`, `CryptoSubscribeButton`, `useSubscription`, and `useCryptoSubscription`
- Subscription management (upgrade/downgrade) with `SubscriptionManagementPanel` and plan change preview

### Fixed
- Comprehensive security and correctness audit (43 items across backend and frontend)
- Admin auth: enforce `isAdmin` flag, validate HTTPS on billing portal redirect, skip Content-Type on GET requests
- Cart: validate server-merged items, prevent merge effect re-firing, release credits holds on payment failure
- Payments: concurrent guard on subscription/refund hooks, double-submit guard on checkout, circuit breaker probe fix
- Config: validate `serverUrl` protocol, sanitize PII regardless of telemetry state
- DOMPurify: enforce `rel="noopener noreferrer"` on all sanitized links
- Backend: auth bypass removal, nonce hardening, refund locking, worker crash recovery, query safety improvements
- Performance: lazy-load boundaries, memoized context values, bounded retry/backoff, batched inventory lookups
- Dead code and duplication cleanup across admin components and utilities

### Security
- Fixed `glob` CLI command injection vulnerability (high severity)
- Fixed `js-yaml` prototype pollution vulnerabilities (moderate severity)

## [1.0.5] - 2025-11-12

### Fixed
- Fixed button width in horizontal layout mode
  - Buttons in horizontal layout now share space equally with `flex: 1`
  - Fixes cart mode buttons being narrower than single-item mode
  - Added `min-width: 0` to prevent flex shrinking issues

## [1.0.4] - 2025-11-12

### Fixed

- Fixed translation key flash on component mount by adding English fallbacks to translation hook
  - Buttons no longer show "ui.purchase", "ui.card", etc. while translations load
  - Fallback translator now returns proper English text instead of raw keys
  - Improves perceived performance and eliminates visual glitches
- Fixed Storybook deployment issues with uuid module resolution
  - Created browser-compatible uuid shim for dependencies
  - Configured Vite resolve alias to redirect uuid imports
  - Eliminated "Failed to resolve module specifier 'uuid'" errors
- Fixed hardcoded product IDs in multi-item cart Storybook story
  - Now reads from STORY_PRODUCTS.cart configuration
  - Makes it easy to update demo products by editing config.ts

### Added

- Documented coupon calculation logic and backend parity requirements
- Backend verification endpoint `GET /paywall/v1/stripe-session/verify` for Stripe checkout sessions
- Automatic content access on successful Stripe payment with reopen functionality
- "Open Your Ebook" button in success notification for content re-access
- Retry logic for payment verification to handle webhook timing delays
- Documentation for verification endpoint in API Reference and README

### Changed

- Updated bundle size stat from "< 50kb gzipped" to accurate "~26kb gzipped" (based on npm stats)
- Landing page demo now verifies Stripe sessions before unlocking content
- Improved error handling for verification failures with user-friendly messages
- Updated payment flow to include server-side confirmation step
- Storybook environment variables now properly configured for production deployment
- Multi-item cart story now uses configurable product IDs from config.ts

## [1.0.3] - 2025-11-10

### Changed

- Updated React peer dependency to support both React 18 and 19 (`"react": "^18.0.0 || ^19.0.0"`)
- Updated React DOM peer dependency to support both React 18 and 19 (`"react-dom": "^18.0.0 || ^19.0.0"`)

## [1.0.2] - 2025-11-10

### Fixed

- Fixed CSS export path in package.json (changed from `./dist/style.css` to `./dist/pay-react.css` to match actual build output)
- Fixed React UMD global error in examples/basic/App.tsx by adding explicit React import
- Fixed TypeScript error for `import.meta.env` in examples by using type assertion

## [1.0.1] - 2025-11-10

### Changed

- Updated README with landing page messaging and clearer value proposition
- Improved Quick Start section with 3-step integration guide
- Restructured Key Features section to match landing page presentation
- Added "How It Works (x402)" section with visual flow diagram
- Simplified example code snippets for better readability

### Added

- Added "stablecoins" keyword to package.json for better npm discoverability

## [1.0.0] - 2025-11-10

### Added

- Initial stable release
- Full Stripe + Solana x402 payment integration
- Multi-item cart support with ceiling-rounded pricing
- Two-phase coupon system (catalog-level and checkout-level)
- Internationalization (i18n) with English and Spanish translations
- Comprehensive error telemetry with PII sanitization
- Token mint validation to prevent fund loss
- CSP helper utilities for production deployment
- Type versioning with v1 namespace
- Refund system with signature verification
- Theme customization and unstyled mode
- Production-ready security features
