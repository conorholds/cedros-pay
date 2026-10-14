# Cedros Pay extension UI

This component builds the host-embedded React administration UI and web
registration surface for the Cedros Pay extension. It is a private build input
to the extension archive and is not published to npm. Cedros Shop provides the
buyer-facing storefront and checkout UI.

## Registration surfaces

| Entry point | Purpose |
| --- | --- |
| `@cedros/pay-react/admin/register` | Admin manifest and plugin bootstrap |
| `@cedros/pay-react/web/register` | Web manifest and module bootstrap |
| `@cedros/pay-react/style.css` | Compiled styles |

Hosts load these entry points from the extension archive. See the
[admin embedding contract](docs/admin-embedding-contract.md) and
[host shell integration guide](docs/admin-shell-embedding-guide.md) for the
services and permissions supplied by the host.

## Development

Use the Node.js and npm versions in the [root README](../README.md). From `ui/`:

```sh
npm ci
npm run type-check
npm run lint
npm test
npm run build
npm run verify:exports
npm run verify:browser-admin
```

The build produces `dist/`. Export verification checks the browser-safe runtime
closure consumed by the extension packager. The UI requires host services for
payment and administration workflows; the Vite development command alone does
not provide a Cedros installation.

Run `make cedros-package` from the repository root to build the complete archive
once its release prerequisites are met. Generated output should not be committed.
See [contributing](CONTRIBUTING.md), [security](SECURITY.md), and the
[command map](../docs/command-map.md) for additional checks.

This component uses the repository's [PILL-1.0.0 license](../LICENSE.md).
