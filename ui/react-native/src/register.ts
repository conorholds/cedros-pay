import {
  cedrosPayNativeExtensionBootstrap,
  type CedrosExtensionBootstrap,
} from './extensionManifest';

export function registerCedrosPayNativeSurface(): CedrosExtensionBootstrap {
  return cedrosPayNativeExtensionBootstrap;
}

export function registerCedrosNativeSurface(): CedrosExtensionBootstrap {
  return registerCedrosPayNativeSurface();
}

export default registerCedrosPayNativeSurface;
