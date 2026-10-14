# Admin Host Embedding Guide

Cedros Pay owns its admin plugin contract and has no dependency on an external
admin UI package. Packaged extension hosts load the registration entrypoint:

```ts
import registerCedrosPayAdminSurface from '@cedros/pay-react/admin/register';

const { manifest, modules } = registerCedrosPayAdminSurface();
```

The returned bootstrap contains `cedrosPayPlugin` in `modules`. The host matches
that module to `manifest.adminModules`, renders its registered sections, and
supplies a service-bag-backed `hostContext`.

The plugin reads payment services from `hostContext.services.cedrosPay`, login
services from `hostContext.services.cedrosLogin`, optional Balance state from
`hostContext.services.cedrosBalance`, and organization permissions from
`hostContext.services.org`. Admin auth still comes from the login service. The
host-facing shapes are internal to the bundled module and are not an additional
public package export.
