import {
  CEDROS_PAY_GROUPS,
  CEDROS_PAY_NAVIGATION_SECTIONS,
  CEDROS_PAY_SECTION_IDS,
} from '../admin/sectionIds';
import {
  CEDROS_PAY_ADMIN_MODULE_ID,
  CEDROS_PAY_EXTENSION_ID,
  CEDROS_PAY_EXTENSION_VERSION,
  CEDROS_PAY_STATUS_CARD_ID,
} from './constants';
import type { AdminModuleManifest } from './types';

/**
 * Canonical Cedros Pay admin module manifest.
 *
 * Single source of truth shared by the published extension manifest
 * (`cedrosPayExtensionManifest.adminModules`) and the runtime admin plugin
 * (`cedrosPayPlugin.manifest`). The host resolves loaded runtime admin modules
 * by `module.manifest.extensionId` + `module.manifest.moduleId`; if the plugin
 * object placed in the bootstrap `modules` array does not carry this manifest,
 * the host discards it and renders its manifest-only "Admin bundle not loaded"
 * fallback instead of the compiled admin surface.
 *
 * `sectionIcons` use the host's limited fallback icon vocabulary (string names),
 * which the host renders before the React plugin's own icon components load.
 */
export const cedrosPayAdminModuleManifest: AdminModuleManifest = {
  moduleId: CEDROS_PAY_ADMIN_MODULE_ID,
  extensionId: CEDROS_PAY_EXTENSION_ID,
  displayName: 'Cedros Pay Admin',
  version: CEDROS_PAY_EXTENSION_VERSION,
  packageName: '@cedros/pay-react',
  packageSubpath: './admin',
  sectionIds: [...CEDROS_PAY_SECTION_IDS],
  sectionIcons: {
    'cedros-pay:transactions': 'history',
    'cedros-pay:catalog': 'extensions',
    'cedros-pay:settings-hub': 'security',
  },
  navigation: {
    sections: CEDROS_PAY_NAVIGATION_SECTIONS.map((section) => ({ ...section })),
    groups: CEDROS_PAY_GROUPS.map((group) => ({ ...group })),
  },
  contributions: {
    dashboardCards: [
      {
        id: CEDROS_PAY_STATUS_CARD_ID,
        displayName: 'Cedros Pay Status',
        description: 'Shows recent payment outcomes from safe dashboard analytics.',
        order: 20,
      },
    ],
  },
};

export const cedrosPayAdminModules: AdminModuleManifest[] = [cedrosPayAdminModuleManifest];
