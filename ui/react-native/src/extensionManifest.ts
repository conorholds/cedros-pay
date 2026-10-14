import canonicalManifest from './extensionManifest.generated.json';
import type { CedrosExtensionBootstrap, CedrosExtensionManifest } from './extensionManifestTypes';

export type { CedrosExtensionBootstrap, CedrosExtensionManifest } from './extensionManifestTypes';

/**
 * Native registration publishes the archive's canonical manifest byte-for-byte.
 * Run `npm run sync:extension-manifest` after changing the root manifest.
 */
export const cedrosPayNativeExtensionManifest = canonicalManifest as CedrosExtensionManifest;

export const cedrosPayNativeExtensionBootstrap: CedrosExtensionBootstrap = {
  manifest: cedrosPayNativeExtensionManifest,
};
