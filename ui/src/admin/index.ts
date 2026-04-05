/**
 * Admin Plugin Exports
 *
 * Exports the cedrosPayPlugin for use with the shared Cedros Admin host.
 * Types are re-exported from @cedros/admin-react.
 */

// Types
export type {
  AdminHostContext,
  AdminHostServiceBag,
  AdminPlugin,
  AdminSectionConfig,
  AdminGroupConfig,
  AdminSectionProps,
  HostContext,
  PluginContext,
  PluginRegistry,
  PluginId,
  SectionId,
  QualifiedSectionId,
  PluginPermission,
} from './types';

// Plugin
export { cedrosPayPlugin } from './plugin';

// Section ID reference for integrators (deep-linking, allowlists, integration tests)
export {
  CEDROS_PAY_SECTIONS,
  CEDROS_PAY_SECTION_IDS,
  CEDROS_PAY_GROUPS,
} from './sectionIds';
export type { SectionReference } from './sectionIds';
