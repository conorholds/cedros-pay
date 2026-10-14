# Cedros Pay

[Web UI](ui/README.md) · [Native registration](ui/react-native/README.md) · [Security](SECURITY.md) · [License](LICENSE.md)

Cedros Pay provides commerce and payments for the Cedros platform. Its extension
backend handles checkout, subscriptions, credits, refunds, inventory, and durable
settlement effects. React registration modules provide the host-embedded admin
and web surfaces; Cedros Shop supplies the buyer-facing storefront.

## Source layout

| Path | Purpose |
| --- | --- |
| `server-wasm/domain/` | Payment rules, request handling, and unit tests |
| `server-wasm/guest/` | WebAssembly component and host-capability adapters |
| `server-wasm/hostsim/` | Wasmtime integration harness |
| `ui/` | React admin and web registration modules |
| `ui/react-native/` | Native extension manifest registration |
| `docs/` | Runtime contracts and test fixtures |

The canonical version and declared extension surfaces are in
[cedros-extension.manifest.json](cedros-extension.manifest.json). The Wasm backend
runs inside a Cedros host that supplies scoped storage, authentication, provider,
secret, and telemetry capabilities. It has no standalone HTTP server.

## Build and test

Use Node.js `24.17.0`, npm `11.13.0`, and the Rust toolchain pinned in
[rust-toolchain.toml](rust-toolchain.toml). Install the Wasm target with
`rustup target add wasm32-wasip2`.

```sh
make install                 # install locked web and native dependencies
make build-ui                # build the React registration modules
make build-native            # build native manifest registration
make build-wasm              # compile the Wasm guest component
make test-ui                 # run React tests
make test-domain             # run Rust domain tests
make test-dependency-security # exercise dependency security regressions
make check-security          # audit Rust and npm dependencies
```

Run compilation and test commands sequentially. The Wasm build may require
native dependencies for transitive C code; see the guest crate's dependency
configuration for the selected toolchain. Built components require host grants
and provider configuration before they can serve an installed extension.

The React modules are extension build inputs; their current package metadata
marks them private. They are not standalone storefront applications or npm SDKs.
The [UI guide](ui/README.md) covers registration and browser export checks.

## Integration contracts

- [Admin embedding](ui/docs/admin-embedding-contract.md) and
  [host services](ui/docs/admin-shell-embedding-guide.md)
- [Financial state invariants](docs/financial-state-invariants.md)
- [Canonical settlement effects](docs/canonical-settlement-effects.md)
- [Admin autosave](docs/autosave.md)

The repository contains source and component checks. Installing a complete
extension and verifying its host permissions, providers, and payment flows are
separate deployment steps.

## Security and license

Report vulnerabilities through the [security policy](SECURITY.md).
Cedros Pay is source-available under [PILL-1.0.0](LICENSE.md), the Personal and
Internal Limited License. See the license for permitted uses and restrictions.
