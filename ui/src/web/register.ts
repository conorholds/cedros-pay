import { cedrosPayExtensionManifest } from '../extension/manifest';
import type { CedrosExtensionBootstrap } from '../extension/types';

// Websites compose their own pricing and program pages using Pay's public APIs.
// Installing Pay must not reserve or publish a customer's marketing routes.
export const cedrosPayWebExtensionBootstrap: CedrosExtensionBootstrap = {
  manifest: cedrosPayExtensionManifest,
};

export function registerCedrosPayWebSurface(): CedrosExtensionBootstrap {
  return cedrosPayWebExtensionBootstrap;
}

export function registerCedrosWebSurface(): CedrosExtensionBootstrap {
  return registerCedrosPayWebSurface();
}

export default registerCedrosPayWebSurface;
