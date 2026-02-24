# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report security vulnerabilities to: security@cedros.dev (or create a private security advisory on GitHub)

## Known Dependency Vulnerabilities

The following vulnerabilities exist in transitive dependencies and are currently unavoidable. We are actively monitoring for patches:

### High Severity

#### bigint-buffer (CVE-2024-XXXXX)
- **Severity**: High (CVSS 7.5)
- **Issue**: Buffer overflow via `toBigIntLE()` function
- **Affected versions**: ≤ 1.1.5
- **Dependency chain**: `@solana/spl-token` → `@solana/buffer-layout-utils` → `bigint-buffer@1.1.5`
- **Status**: ❌ No patch available (latest is 1.1.5)
- **Mitigation**:
  - This library is used internally by Solana's SPL Token library for serialization
  - The vulnerable function is not directly called by our code
  - Solana team is aware and working on migration to safer alternatives
  - Impact is limited to DoS (denial of service), not code execution
- **Risk Assessment**: **Acceptable for now** - Required for Solana functionality, low exploitability in our use case
- **Tracking**: Monitoring @solana/spl-token updates for dependency change

### Low Severity

#### fast-redact (CVE-2024-XXXXX)
- **Severity**: Low (CVSS 0.0)
- **Issue**: Prototype pollution vulnerability
- **Affected versions**: ≤ 3.5.0
- **Dependency chain**: `@solana/wallet-adapter-wallets` → `@walletconnect/universal-provider` → `@walletconnect/logger` → `pino` → `fast-redact@3.5.0`
- **Status**: ❌ No patch available (latest is 3.5.0)
- **Mitigation**:
  - Used only in logging library (pino) within WalletConnect provider
  - Prototype pollution requires attacker control over logger input
  - WalletConnect library only logs internal state, not user input
  - Only loaded when user connects via WalletConnect wallets (Phantom, Solflare use direct adapters)
- **Risk Assessment**: **Acceptable** - Very low exploitability, dev-time logging only
- **Tracking**: Monitoring pino and @walletconnect updates

## Security Updates

### 2025-01-XX
- ✅ Fixed vue-template-compiler XSS (MEDIUM) by updating vite-plugin-dts from 3.9.1 to 4.5.4
- ✅ Verified esbuild vulnerability already patched (using v0.25.12)
- 📝 Documented bigint-buffer (HIGH) - no patch available, monitoring upstream
- 📝 Documented fast-redact (LOW) - no patch available, minimal risk

## Security Best Practices

When using this library:

1. **Never expose sensitive data in override objects** - Theme overrides are frozen but avoid passing secrets
2. **Validate backend responses** - Always validate x402 payment requirements from your backend
3. **Use HTTPS in production** - Ensure `serverUrl` uses HTTPS to prevent MITM attacks
4. **Keep dependencies updated** - Run `npm audit` regularly and update when patches are available
5. **Monitor transaction signatures** - Verify all Solana transactions match expected amounts and recipients

## Contact

For security concerns, contact: security@cedros.dev
