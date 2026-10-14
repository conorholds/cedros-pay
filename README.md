# Cedros Pay

**The commerce foundation for the Cedros platform.**

[Explore Cedros](https://cedros.ai/) · [Cedros Login](https://github.com/conorholds/cedros-login) · [Web UI](ui/README.md) · [Security](SECURITY.md) · [License](LICENSE.md)

## What is Cedros?

Cedros is an AI-native website platform that enables businesses, agencies, and developers to create, manage, and operate websites using artificial intelligence.

Unlike traditional website builders that primarily use AI to generate designs or content, Cedros is designed for ongoing collaboration between website owners and AI agents. Websites become active business tools that agents can understand, modify, and operate through natural language instructions.

The platform combines website creation, hosting, content management, AI capabilities, and an extensible ecosystem of business functionality.

**Key capabilities include:**

- **AI Website Creation:** Build and customize websites using natural language, with control over design, structure, content, and functionality.
- **Agent-Native Management:** Enable authorized AI agents to manage website content, make changes, and interact with supported business operations.
- **Extensible Functionality:** Add capabilities such as online stores, payments, directories, events, and other business-specific workflows through extensions.
- **Integrated Intelligence:** Use AI to assist with content creation, ongoing website management, and operational tasks.
- **Business and Developer Tools:** Manage hosted websites, custom domains, permissions, and extensible functionality for different business requirements.

Cedros is designed for small and medium-sized businesses seeking to reduce the technical work involved in maintaining an online presence, as well as agencies and developers building websites for clients.

Its agent-native architecture allows websites to function as more than static destinations. Rather than relying entirely on manual administration, owners can delegate supported tasks to AI while maintaining control over their websites and business operations.

The goal of Cedros is to make websites an active part of running a business, combining the flexibility of modern web development with the accessibility and operational capabilities of AI agents.

**Websites that think, act, and work for you.**

## Where Cedros Pay fits

Cedros Pay is one of the platform's core extensions: the commerce building
block that other extensions and applications can build around. It provides
checkout, subscriptions, credits, refunds, inventory, and payment-linked access
so you can focus on the product or experience you want to create.

- **Sell products and services:** build around shared checkout and payment records.
- **Offer subscriptions and memberships:** use subscription status and paid-access
  checks to decide which features a customer can use.
- **Keep commerce records together:** build your customer experience around
  consistent purchase, credit, and refund records.
- **Keep commerce in the site workflow:** manage products and payments through
  React modules embedded in the Cedros admin.

[Cedros Login](https://github.com/conorholds/cedros-login) supplies customer
identity, Pay owns the commerce records, and Cedros Shop supplies the
buyer-facing storefront. For example, a custom membership extension can use
Login for accounts and Pay for subscription access while owning its own member
experience and business rules.

## Start here

- **New to the platform?** [Explore Cedros](https://cedros.ai/) to see the broader
  platform and what you can build with it.
- **Integrating an admin or storefront?** Read the [UI guide](ui/README.md) and
  [host services guide](ui/docs/admin-shell-embedding-guide.md).
- **Working on extension source?** Use the component layout and build commands
  below. [Native registration](ui/react-native/README.md) is covered separately.

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
