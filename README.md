# Cedros Pay

[Documentation](docs/README.md) · [Architecture](#architecture) ·
[Development](#local-development) · [Security](SECURITY.md) · [License](LICENSE.md)

Cedros Pay is the commerce and payments extension for Cedros sites. This
source-available repository is a reference for its payment domain, host
integration, and embedded administration UI.

Pay provides catalog and pricing records, authoritative carts and checkout,
payment and subscription processing, refunds, entitlements, and commerce
administration. Its backend runs as a WebAssembly component inside Cedros Data.
Cedros Shop owns the buyer-facing storefront and checkout experience; Pay owns
the payment and commerce contracts it consumes.

## Architecture

| Directory | Responsibility |
| --- | --- |
| `server-wasm/domain/` | Payment rules, routes, and jobs behind testable host interfaces |
| `server-wasm/guest/` | WebAssembly adapter for the Cedros host capabilities |
| `server-wasm/hostsim/` | Wasmtime integration tests with simulated host services |
| `ui/` | Host-embedded React admin and web registration surfaces |
| `ui/react-native/` | Native extension manifest registration |
| `docs/` | Integration contracts, architecture, and development commands |
| `scripts/` | Validation, extension packaging, and release evidence |

Runtime services, storage, secrets, authentication, and provider capabilities
come from a compatible Cedros host. The supported deployment unit is a
`.cedros-extension.zip` archive containing the Wasm component and UI runtimes.
This repository has no standalone payment server or database. The npm components
are private archive inputs; their package names are host registration identifiers.

For a guided source tour, start with the [feature map](docs/feature-map.md),
[checkout contract](docs/cedros-pay-checkout-contract.md), and
[financial invariants](docs/financial-state-invariants.md). The
[manifest](cedros-extension.manifest.json) declares the host-facing surfaces and
required capabilities.

## Local development

Use Node.js 24.17.0 ([`.nvmrc`](.nvmrc)), npm 11.13.0, and Rust 1.94.0 with
`rustfmt` and `clippy` ([`rust-toolchain.toml`](rust-toolchain.toml)). Docker is
required for the deterministic release Wasm build. Python 3 runs the capacity
contract fixtures.

From the repository root:

```sh
npm --prefix ui ci
npm --prefix ui/react-native ci
make help
```

Choose checks for the area you change. Domain tests use simulated host services
and do not require Docker or a running Cedros installation:

```sh
cargo test --locked --manifest-path server-wasm/Cargo.toml -p cedros-pay-extension-domain
```

For the admin/web runtime:

```sh
npm --prefix ui run type-check
npm --prefix ui run lint
npm --prefix ui test
npm --prefix ui run build
npm --prefix ui run verify:exports
```

For native registration, run `npm --prefix ui/react-native run ci:checks`.
See the [command map](docs/command-map.md) for focused checks and the
[UI README](ui/README.md) for embedding details. Run heavyweight builds and test
suites sequentially.

## Extension builds and release status

The public repository is a source snapshot with its own Git history. Release
verification requires the original provenance commits recorded in
`cedros-extension.release-inputs.json` and `cedros-extension.release-readiness.json`;
those private development commits are not imported into this repository. In a
maintainer checkout with that history available:

```sh
make verify-wit
make cedros-verify
# Requires reviewed, committed inputs and current release-input evidence:
make cedros-package
```

`make cedros-verify` builds the Wasm component and runs domain and Wasmtime host
simulation tests. `make cedros-package` produces the archive in `artifacts/`,
including compiled admin/web and native registration runtimes plus supply-chain
evidence. The [command map](docs/command-map.md) describes validation prerequisites.

Source publication does not establish deployment readiness. The
[release-readiness record](cedros-extension.release-readiness.json) tracks archive
provenance and outstanding host/provider acceptance gates. Changed package inputs
require fresh evidence and an archive rebuild before installation.

## Public source publication

`make publish-source` prepares the existing `~/Workspace/published/cedros-pay/`
Git checkout from committed source without compiling or uploading an extension.
Use `make publish-source PUBLISH_ARGS=--dry-run` first; override the checkout root
with `PUBLISH_REPO`. The destination must be clean (including untracked and
ignored files) and have `conorholds/cedros-pay` as its origin. Preparation replaces
legacy package artifacts while preserving Git history and remotes. It excludes
local configuration, environment secrets, generated output, and extension ZIPs;
review the source for publication separately, since exclusions are not a secret
audit. Review the destination diff before committing or pushing. Historical MIT
releases retain their original license notices in Git history; the current
snapshot uses [LICENSE.md](LICENSE.md). Extension acceptance and installation
remain separate release operations.

## Documentation and contributions

Browse the [documentation index](docs/README.md). Contributors and coding agents
must follow [AGENTS.md](AGENTS.md); UI-specific checks are in the
[contributing guide](ui/CONTRIBUTING.md). Report vulnerabilities using the
[security policy](SECURITY.md).

## License

Cedros Pay is source-available under PILL-1.0.0, the Personal and Internal Limited
License. See [LICENSE.md](LICENSE.md) for permitted uses and restrictions.
SPDX-style source headers use `LicenseRef-PILL-1.0.0`.
