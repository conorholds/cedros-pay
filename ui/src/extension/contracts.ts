import {
  CEDROS_EXTENSION_ADMIN_REGISTRATION_SUBPATH,
  CEDROS_EXTENSION_NATIVE_REGISTRATION_SUBPATH,
  CEDROS_EXTENSION_WEB_REGISTRATION_SUBPATH,
  type CedrosExtensionPackageFamily,
  type CedrosExtensionRegistration,
  type CedrosExtensionSurfaces,
} from './types';

interface CedrosSurfaceOptions {
  adminModuleIds?: string[];
  slotIds?: string[];
  editorSurfaceIds?: string[];
  routeIds?: string[];
  blockTypes?: string[];
  templateIds?: string[];
  authoredSurfaceIds?: string[];
  templateUtilityIds?: string[];
  nativeScreenIds?: string[];
  nativeStackIds?: string[];
  nativeProviderIds?: string[];
  serverMigrations?: string[];
  serverSettingsSchemas?: string[];
  serverContentModels?: string[];
  serverRoutes?: string[];
  serverJobs?: string[];
  serverEvents?: string[];
}

export function buildCedrosExtensionRegistration(
  packageFamily: CedrosExtensionPackageFamily
): CedrosExtensionRegistration {
  const serverCrateName = packageFamily.server.packageName.replace(/-/g, '_');

  return {
    server: {
      entrypoint: `${serverCrateName}::register_extension_family`,
    },
    admin: {
      entrypoint: `${packageFamily.react.packageName}${CEDROS_EXTENSION_ADMIN_REGISTRATION_SUBPATH}`,
    },
    web: {
      entrypoint: `${packageFamily.react.packageName}${CEDROS_EXTENSION_WEB_REGISTRATION_SUBPATH}`,
    },
    native: {
      entrypoint: `${packageFamily.reactNative.packageName}${CEDROS_EXTENSION_NATIVE_REGISTRATION_SUBPATH}`,
    },
  };
}

export function buildCedrosExtensionSurfaces(
  options: CedrosSurfaceOptions = {}
): CedrosExtensionSurfaces {
  const nativeScreenIds = uniqueIds(options.nativeScreenIds ?? []);
  const nativeStackIds = uniqueIds(options.nativeStackIds ?? []);
  const nativeProviderIds = uniqueIds(options.nativeProviderIds ?? []);

  return {
    server: {
      packageRef: 'server',
      required: true,
      migrations: options.serverMigrations ?? [],
      settingsSchemas: options.serverSettingsSchemas ?? [],
      contentModels: options.serverContentModels ?? [],
      routes: options.serverRoutes ?? [],
      jobs: options.serverJobs ?? [],
      events: options.serverEvents ?? [],
    },
    admin: {
      packageRef: 'react',
      required: true,
      moduleIds: uniqueIds(options.adminModuleIds ?? []),
      slotIds: uniqueIds(options.slotIds ?? []),
      editorSurfaceIds: uniqueIds(options.editorSurfaceIds ?? []),
    },
    web: {
      packageRef: 'react',
      required: true,
      routeIds: uniqueIds(options.routeIds ?? []),
      blockTypes: uniqueIds(options.blockTypes ?? []),
      templateIds: uniqueIds(options.templateIds ?? []),
      authoredSurfaceIds: uniqueIds(options.authoredSurfaceIds ?? []),
      templateUtilityIds: uniqueIds(options.templateUtilityIds ?? []),
    },
    native: {
      packageRef: 'reactNative',
      required: true,
      screenIds: nativeScreenIds,
      stackIds: nativeStackIds,
      providerIds: nativeProviderIds,
    },
  };
}

function uniqueIds(values: string[]): string[] {
  return Array.from(new Set(values));
}
