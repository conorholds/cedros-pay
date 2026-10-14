import { assert } from './validation-helpers.mjs';

export function assertSurfaceRequirements(manifest) {
  const { packageFamily, surfaces } = manifest;

  assert(packageFamily.server.required === true, 'server package must be required');
  assert(packageFamily.react.required === true, 'react package must be required');
  assert(
    packageFamily.reactNative.required === true,
    'packageFamily.reactNative must remain required for canonical Cedros extension intake.',
  );
  assert(surfaces.server.required === true, 'server surface must be required');
  assert(surfaces.admin.required === true, 'admin surface must be required');
  assert(
    surfaces.web.required === true,
    'surfaces.web.required must stay true for local package intake.',
  );
  assert(
    surfaces.native.required === true,
    'surfaces.native.required must stay true for local package intake.',
  );
}
