# Contributing to the extension UI

The admin/web component and native registration component are built together
into one Cedros extension archive.

From `ui/`, run `npm run ci:checks`, then `npm run build` and
`npm run verify:exports`. Admin runtime changes also need
`npm run verify:browser-admin`. From `ui/react-native/`, `npm run ci:checks`
already includes the build and export verification. Build output is generated
and must not be edited or committed.

Host integration contracts are in [docs/admin-embedding-contract.md](docs/admin-embedding-contract.md)
and [docs/admin-shell-embedding-guide.md](docs/admin-shell-embedding-guide.md).
The [root README](../README.md) lists component build and test commands.
