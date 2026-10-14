# Security policy

Security fixes target the current Cedros Pay extension major line and `main`.
See the [full security policy](ui/SECURITY.md) for supported versions, dependency
audits, and deployment practices.

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/conorholds/cedros-pay/security/advisories/new).
Include the affected version, reproduction steps, and impact. Remove credentials
and personal data. Do not disclose unpatched vulnerabilities in public issues.

## Dependency guardrails

Development dependencies pin patched brace expansion, URI parsing, source-map,
and selector-parser releases. The `braces` depth-guard backport bounds parser and
AST depth. The local BSD-licensed `sprintf-js` precision backport preserves the
existing API Extractor argument parser and clamps numeric formatting precision.
Run `make test-dependency-security` after installing the locked UI dependencies.
The Wasmtime host-simulation harness uses the security-patched 48.0.x line.

`make check-security` audits both npm trees and the Rust workspace. Passing
source audits does not establish that an older installed archive is patched;
changed inputs require a separately verified extension rebuild and installation.
