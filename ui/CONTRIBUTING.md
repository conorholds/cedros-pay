# Contributing to Cedros Pay

Thank you for your interest in contributing to Cedros Pay! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful and professional in all interactions. We're building a payment library that merchants trust with their customers' money - professionalism and quality are paramount.

## Development Setup

```bash
git clone https://github.com/conorholds/cedros-pay.git
cd cedros-pay/ui
npm install
npm run dev
```

## Testing

All PRs must pass the following checks:

- `npm run lint` - ESLint checks
- `npm run type-check` - TypeScript strict mode
- `npm test` - Unit tests (100% pass rate required)
- `npm run test:coverage` - Coverage thresholds (80% global, 90% critical paths)

### Coverage Requirements

- **Global Coverage**: 80% statements, lines, and functions; 75% branches
- **Critical Paths** (90% required):
  - `src/components/CedrosPay.tsx`
  - `src/hooks/useStripeCheckout.ts`
  - `src/hooks/useX402Payment.ts`

## Code Style

### Architecture Principles

This project follows strict architectural patterns as outlined in `CLAUDE.md` and `ARCHITECTURE.md`:

- **Single Responsibility**: Each file, class, or function should do ONE thing only
- **Manager Pattern**: Business logic lives in dedicated manager classes
  - `StripeManager` - Stripe session creation and redirect
  - `X402Manager` - x402 protocol handling
  - `WalletManager` - Solana wallet abstraction
- **Hook Pattern**: React hooks expose manager functionality to components
- **Provider Pattern**: Context provides shared config (Stripe keys, server URLs, etc.)

### File Organization

- `/src/components/` - UI components (<500 lines each)
- `/src/hooks/` - Custom hooks (useCedrosPay, useStripeCheckout, useX402Payment)
- `/src/managers/` - Business logic (payment managers)
- `/src/types/` - TypeScript interfaces
- `/src/utils/` - Pure utility functions
- `/src/context/` - React context providers

### Code Standards

- **TypeScript strict mode** - All code must pass strict type checking
- **Max file length**: 500 lines (per `CLAUDE.md`)
- **Max function length**: 40-60 lines
- **Max class length**: 200 lines (split into smaller helpers if exceeded)
- **Naming conventions**:
  - Use descriptive, intention-revealing names
  - Avoid vague names like `data`, `info`, `helper`, `temp`
  - Managers end in `Manager` (e.g., `StripeManager`)
  - Hooks start with `use` (e.g., `useCedrosPay`)

### Security Guidelines

- **NEVER** store private keys or secrets in frontend code
- **NEVER** commit `.env` files (use `.env.example` for templates)
- All crypto amounts must use proper decimal handling (USDC: 6 decimals, SOL: 9 decimals)
- Validate token mint addresses against known stablecoins
- Use rate limiting and circuit breakers for all external API calls
- Include idempotency keys for all payment operations

## Submitting PRs

1. **Fork the repo** and create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** following the code standards above

3. **Write tests** for new functionality:
   - Unit tests for utilities and managers
   - Component tests for React components
   - Integration tests for complex flows

4. **Ensure all checks pass**:
   ```bash
   npm run lint
   npm run type-check
   npm test
   npm run test:coverage
   ```

5. **Commit with conventional commits**:
   ```bash
   git commit -m "feat: add new payment method"
   git commit -m "fix: resolve race condition in quote requests"
   git commit -m "docs: update API reference for cart checkout"
   ```

   Commit types:
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `test:` - Test additions/changes
   - `refactor:` - Code refactoring
   - `perf:` - Performance improvements
   - `chore:` - Maintenance tasks

6. **Push and open PR**:
   ```bash
   git push origin feature/my-feature
   ```
   Then open a pull request on GitHub

7. **Wait for CI checks and code review**

## Architecture Guidelines

See `CLAUDE.md` and `ARCHITECTURE.md` for detailed architectural principles.

### Key Concepts

**Triple Payment Model:**
- Stripe flow: Traditional redirect-based checkout
- x402 flow: Stateless, header-based crypto payments using HTTP 402
- Credits flow: JWT-authenticated payments using cedros-login Credits

**Component Philosophy:**
- This is a **library**, not an app
- All components must be reusable and framework-agnostic where possible
- Components should accept backend URLs via context (no hardcoded endpoints)
- Payment flows are async with clear status states (idle, loading, success, error)

### Adding New Features

When adding new payment methods or features:

1. **Create a Manager class** for business logic (e.g., `NewPaymentManager.ts`)
2. **Create a Hook** to expose manager functionality (e.g., `useNewPayment.ts`)
3. **Create a Component** for UI (e.g., `NewPaymentButton.tsx`)
4. **Add to Context** if global config is needed
5. **Write comprehensive tests** (unit + integration)
6. **Update documentation** (README, API_REFERENCE)

## Running Tests Locally

```bash
# Run all tests
npm test

# Run specific test file
npm test src/__tests__/stripeManager.test.ts

# Run with coverage
npm run test:coverage

# Watch mode for development
npm test -- --watch

# Duplication drift guard (web/RN mirrored paths)
npm run check:duplication:report
```

CI runs `npm run check:duplication` and fails when new mirrored `src/**` + `react-native/src/**` file paths are introduced without an explicit baseline update.

## Documentation

When adding new features:
- Update `README.md` with usage examples
- Update `API_REFERENCE.md` with API docs
- Add JSDoc comments to all public APIs
- Include code examples in docs

## Questions?

- Check existing issues on GitHub
- Read `ARCHITECTURE.md` for design decisions
- Review `CLAUDE.md` for coding standards
- See `SECURITY.md` for security guidelines
- See `docs/shared-module-migration.md` for web/RN shared-module migration rules

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
