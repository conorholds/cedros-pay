# Cedros Pay native extension registration

This private build component supplies `@cedros/pay-react-native/register` inside
the Cedros Pay extension archive. It returns the canonical extension manifest
and has no payment SDK, native screens, providers, or runtime dependencies.

Use the Node.js and npm versions in the [root README](../../README.md).
From `ui/react-native/`:

```sh
npm ci
npm run ci:checks
```

After editing the [root manifest](../../cedros-extension.manifest.json), run
`npm run sync:extension-manifest` and commit the generated source mirror.
`npm run check:extension-manifest` verifies that the mirror is current.

`npm run build` generates `esm/`, `lib/`, and `types/`. The archive uses
`esm/register.js`; CommonJS and declarations support local verification.
Generated build directories should not be committed. The [root README](../../README.md)
lists component build and test commands.

This component uses the repository's [PILL-1.0.0 license](../../LICENSE.md).
