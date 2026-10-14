# Admin Embedding Contract

`cedros-pay` participates in an extension host through `cedrosPayPlugin`. The
plugin and its host-facing interfaces are owned by `@cedros/pay-react`.

Packaged hosts should load the declared registration entrypoint:

```ts
import registerCedrosPayAdminSurface from '@cedros/pay-react/admin/register';

const bootstrap = registerCedrosPayAdminSurface();
```

The returned bootstrap contains the manifest and the `cedrosPayPlugin` module.
The package does not expose a separate `@cedros/pay-react/admin` integration
entrypoint; hosts consume the registration bootstrap and provide the services,
route hints, and permissions described by the bundled module contract.
