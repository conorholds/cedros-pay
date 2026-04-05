# Admin Embedding Contract

`cedros-pay` participates in the shared Cedros Admin shell through
`cedrosPayPlugin`.

```tsx
import { AdminShell } from '@cedros/admin-react';
import { cedrosPayPlugin } from '@cedros/pay-react/admin';

<AdminShell plugins={[cedrosPayPlugin]} hostContext={hostContext} />
```

`cedros-pay` does not require an installed-extension manifest bundle to render
under the shared shell.
