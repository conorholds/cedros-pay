# Security policy

## Supported versions

Security fixes target the current extension major line and `main`.

| Version | Supported |
| --- | --- |
| 5.x | Yes |
| < 5.0.0 | No |

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/conorholds/cedros-pay/security/advisories/new)
to report vulnerabilities to the maintainers. Include the affected
extension version, reproduction steps, impact, and any relevant transaction or
request shape with secrets removed.

Do not open public issues for unpatched vulnerabilities or include API keys,
wallet private keys, JWTs, customer PII, or production transaction secrets in
reports.

## Dependency audits

Run the current audits rather than relying on a dated result:

```sh
make check-security
npm --prefix ui audit --audit-level=high --omit=dev
npm --prefix ui/react-native audit --audit-level=high --omit=dev
```

Review full development-tree findings separately; the released product is the
extension archive, not either private npm build input.

## Security practices

1. Store provider credentials only through the host's encrypted-secret seams;
   never put them in metadata, component props, logs, or analytics payloads.
2. Keep payment, refund, inventory, and authorization decisions server-side and
   fail closed when trusted host context is missing.
3. Use HTTPS in production and restrict return, redirect, and outbound egress
   allowlists.
4. Preserve the exact guarded-policy marker and idempotency/replay boundaries.
5. Verify Solana transactions against the expected amount, mint, recipient,
   memo, resource, cluster, and signing authority before settlement.
