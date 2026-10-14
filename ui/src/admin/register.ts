import '../styles.css';
import { injectCedrosPayAdminStyles } from './runtimeStyles';
import { cedrosPayPlugin } from './plugin';
import { cedrosPayExtensionManifest } from '../extension/manifest';
import type { CedrosExtensionBootstrap } from '../extension/types';

// The host imports this module from the extension archive; older host builds
// never load the archive's standalone CSS, so the bundle styles itself.
injectCedrosPayAdminStyles();

export const cedrosPayAdminExtensionBootstrap: CedrosExtensionBootstrap = {
  manifest: cedrosPayExtensionManifest,
  modules: [cedrosPayPlugin],
};

export function registerCedrosPayAdminSurface(): CedrosExtensionBootstrap {
  return cedrosPayAdminExtensionBootstrap;
}

export function registerCedrosAdminSurface(): CedrosExtensionBootstrap {
  return registerCedrosPayAdminSurface();
}

export default registerCedrosPayAdminSurface;
