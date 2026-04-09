# AdminShell Embedding Guide

Use `AdminShell` with `cedrosLoginPlugin` and `cedrosPayPlugin` to create one
unified admin dashboard.

This is the only supported admin integration path for `cedros-pay`. The package
no longer ships a standalone admin dashboard.

```tsx
import { AdminShell, HOST_SERVICE_IDS } from '@cedros/admin-react';
import { cedrosLoginPlugin } from '@cedros/login-react/admin-only';
import { cedrosPayPlugin } from '@cedros/pay-react/admin';

<AdminShell
  plugins={[cedrosLoginPlugin, cedrosPayPlugin]}
  hostContext={{
    services: {
      [HOST_SERVICE_IDS.cedrosLogin]: {
        user,
        getAccessToken,
        serverUrl: loginServerUrl,
      },
      [HOST_SERVICE_IDS.cedrosPay]: {
        serverUrl: payServerUrl,
        jwtToken,
        walletAddress,
      },
    },
    org,
  }}
  defaultSection="cedros-pay:transactions"
/>
```

The shared contract is `plugins={[...]}` plus a service-bag-backed `hostContext`.

Admin auth comes from `cedros-login`; `cedros-pay` consumes the resulting host
services and registers payment/admin sections under the shared shell.
