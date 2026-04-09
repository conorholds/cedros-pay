# Admin Embedding Contract

`cedros-pay` participates in the shared Cedros Admin shell through
`cedrosPayPlugin`.

Admin usage requires the shared shell from `@cedros/admin-react`. The canonical
host also includes `cedros-login` as the admin auth provider.

```tsx
import { AdminShell } from '@cedros/admin-react';
import { cedrosPayPlugin } from '@cedros/pay-react/admin';

<AdminShell plugins={[cedrosPayPlugin]} hostContext={hostContext} />
```

`cedros-pay` does not require an installed-extension manifest bundle to render
under the shared shell.

`@cedros/pay-react` no longer exports a standalone admin dashboard component or
`./standalone-admin` entrypoint.
